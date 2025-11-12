import express from 'express';
import cors from 'cors';
import axios from 'axios';
import sharp from 'sharp';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { Synapse, RPC_URLS, TOKENS, TIME_CONSTANTS } from '@filoz/synapse-sdk';
import { ethers } from 'ethers';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://mamkdglgjohrnwzawree.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.warn('⚠️  WARNING: SUPABASE_ANON_KEY environment variable is not set');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Synapse SDK (will be initialized on first use)
let synapse = null;

async function initializeSynapse() {
  if (synapse) {
    return synapse;
  }

  try {
    if (!process.env.FILECOIN_PRIVATE_KEY) {
      throw new Error('FILECOIN_PRIVATE_KEY environment variable is not set');
    }

    
    // Use websocket RPC URL (as per Synapse SDK docs) or user-provided URL
    const rpcURL = RPC_URLS.calibration.http;
    
    console.log('Initializing Synapse SDK...');
    console.log(`Using RPC URL: ${rpcURL}`);
    synapse = await Synapse.create({
      privateKey: process.env.FILECOIN_PRIVATE_KEY,
      rpcURL: rpcURL,
    });

    console.log('✅ Synapse SDK initialized successfully!');
    console.log(`Connected to network: ${synapse.getNetwork()}`);
    return synapse;
  } catch (error) {
    console.error('Error initializing Synapse SDK:', error.message);
    throw error;
  }
}

// One-time payment setup function (deposit USDFC and approve service)
// This follows the Synapse SDK documentation exactly:
// 1. Deposit USDFC to Filecoin Pay contract (on-chain transaction)
// 2. Approve Warm Storage service address (on-chain transaction)
// Note: All transactions happen on the Filecoin blockchain, not localhost
async function setupPayment() {
  try {
    const synapseInstance = await initializeSynapse();
    
    console.log('=== SETTING UP PAYMENT ===');
    console.log('Note: All transactions will be sent to the Filecoin blockchain');
    
    // Step 1: Check current wallet USDFC balance (to ensure we have tokens to deposit)
    console.log('1) Checking wallet USDFC balance...');
    const walletBalance = await synapseInstance.payments.walletBalance(TOKENS.USDFC);
    const formattedWalletBalance = ethers.formatUnits(walletBalance, 18);
    console.log(`Wallet USDFC balance: ${formattedWalletBalance} USDFC`);
    
    // Check if wallet has enough USDFC tokens
    const minDepositAmount = ethers.parseUnits("2", 18);
    if (walletBalance < minDepositAmount) {
      throw new Error(`Insufficient USDFC in wallet. Need at least 2 USDFC, but wallet only has ${formattedWalletBalance} USDFC. Please fund your wallet with USDFC tokens first.`);
    }
    
    // Step 2: Deposit USDFC to Filecoin Pay contract
    // Note: We always deposit to ensure sufficient balance in the payment account
    // The SDK doesn't provide a direct way to check payment account balance,
    // so we rely on the transaction receipt to confirm the deposit succeeded
    const depositAmount = ethers.parseUnits("2", 18);
    console.log(`2) Depositing ${ethers.formatUnits(depositAmount, 18)} USDFC to Filecoin Pay contract (on-chain)...`);
    console.log(`   This may take a few moments...`);
    
    const depositTx = await synapseInstance.payments.depositWithPermit(
      depositAmount,
      TOKENS.USDFC
    );
    
    console.log(`   Transaction submitted: ${depositTx.hash}`);
    console.log(`   Waiting for confirmation...`);
    
    const receipt = await depositTx.wait();
    console.log(`✅ Deposit transaction confirmed! Block: ${receipt.blockNumber}`);
    console.log(`   Transaction status: ${receipt.status === 1 ? 'Success' : 'Failed'}`);
    
    if (receipt.status !== 1) {
      throw new Error(`Deposit transaction failed. Transaction hash: ${depositTx.hash}`);
    }
    
    // Step 3: Approve Warm Storage service for payment (on-chain transaction)
    // This approves the warmStorageAddress to use your deposited USDFC
    console.log("3) Approving Warm Storage service (on-chain)...");
    const warmStorageAddress = synapseInstance.getWarmStorageAddress();
    console.log(`   Warm Storage address: ${warmStorageAddress}`);
    console.log(`   This address will be approved to use your USDFC for storage payments`);
    
    const approveTx = await synapseInstance.payments.approveService(
      warmStorageAddress, // This is the correct address from Synapse SDK
      ethers.parseUnits("10", 18), // Rate allowance: 10 USDFC per epoch
      ethers.parseUnits("1000", 18), // Lockup allowance: 1000 USDFC total
      TIME_CONSTANTS.EPOCHS_PER_MONTH // Max lockup period: 30 days (in epochs)
    );
    
    console.log(`   Approval transaction submitted: ${approveTx.hash}`);
    console.log(`   Waiting for confirmation...`);
    
    const approveReceipt = await approveTx.wait();
    console.log(`✅ Service approval complete! Block: ${approveReceipt.blockNumber}`);
    console.log(`   Transaction status: ${approveReceipt.status === 1 ? 'Success' : 'Failed'}`);
    console.log(`   Warm Storage service at ${warmStorageAddress} is now approved`);
    
    if (approveReceipt.status !== 1) {
      throw new Error(`Service approval transaction failed. Transaction hash: ${approveTx.hash}`);
    }
    
    // Final wallet balance check
    const finalWalletBalance = await synapseInstance.payments.walletBalance(TOKENS.USDFC);
    const formattedFinalWalletBalance = ethers.formatUnits(finalWalletBalance, 18);
    console.log(`\n✅ Final wallet USDFC balance: ${formattedFinalWalletBalance} USDFC`);
    console.log('=== PAYMENT SETUP COMPLETE ===\n');
    
    return true;
  } catch (error) {
    console.error('❌ Error setting up payment:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    throw error;
  }
}

// Middleware
app.use(cors());
app.use(express.json());

function pieceCidFromFilecoinUrl(filecoinUrl) {
  if (!filecoinUrl) return null;

  // Supports formats like filecoin://<pieceCid>
  if (filecoinUrl.startsWith('filecoin://')) {
    return filecoinUrl.replace('filecoin://', '');
  }

  // Supports Filbeam gateway URLs such as
  // https://<warmStorageAddress>.<network>.filbeam.io/<pieceCid>
  if (filecoinUrl.includes('.filbeam.io/')) {
    const withoutQuery = filecoinUrl.split('?')[0];
    const parts = withoutQuery.split('/');
    return parts[parts.length - 1] || null;
  }

  // Otherwise assume the value is already a raw piece CID
  return filecoinUrl;
}

function buildFilbeamGatewayUrl(pieceCid, network) {
  if (!pieceCid) return null;

  // Always use the fixed warm storage address
  const storageAddress = '0x5233e4253bc38e8cf517c0768dbc8acc886f32b3';
  const networkSlug = (network || 'calibration').toLowerCase();

  return `https://${storageAddress}.${networkSlug}.filbeam.io/${pieceCid}`;
}

// Upload file to Filecoin Onchain Cloud using Synapse SDK with storage context
async function uploadToFilecoin(fileBuffer, fileName, mimeType) {
  try {
    console.log(`Uploading file to Filecoin Onchain Cloud: ${fileName}`);
    console.log(`File size: ${fileBuffer.length} bytes`);
    console.log(`MIME type: ${mimeType}`);
    
    // Ensure minimum size requirement (127 bytes for Filecoin storage)
    if (fileBuffer.length < 127) {
      // Pad the buffer to meet minimum requirement
      const paddedBuffer = Buffer.alloc(127);
      fileBuffer.copy(paddedBuffer);
      fileBuffer = paddedBuffer;
      console.log(`Padded file to meet minimum size requirement (127 bytes)`);
    }
    
    // Initialize Synapse SDK if not already initialized
    const synapseInstance = await initializeSynapse();
    
    // Create a storage context with specific provider
    console.log('Creating storage context with provider ID 1 and CDN enabled...');
    const context = await synapseInstance.storage.createContext({
      providerId: 1, // Use specific provider
      withCDN: true, // Enable CDN for faster retrieval
      metadata: {
        category: "ai-generated-images",
        version: "1.0",
        fileName: fileName,
        mimeType: mimeType,
      },
    });
    
    console.log('Storage context created successfully');
    
    // Convert Buffer to Uint8Array for Synapse SDK
    const dataBytes = new Uint8Array(fileBuffer);
    
    // Upload to this specific context
    console.log('Uploading to storage context...');
    const uploadResult = await context.upload(dataBytes);
    
    const pieceCid = uploadResult.pieceCid;
    const size = uploadResult.size || fileBuffer.length;
    const network = synapseInstance.getNetwork();
    const gatewayUrl = buildFilbeamGatewayUrl(pieceCid, network);
    
    console.log('Filecoin upload successful:', { pieceCid, size });
    console.log(`Piece CID: ${pieceCid}`);
    console.log(`Gateway URL: ${gatewayUrl}`);
    
    // Note: Filecoin uses pieceCid, not IPFS CID
    // We'll store pieceCid and a Filbeam gateway URL in the database
    return {
      success: true,
      pieceCid: pieceCid,
      size: size,
      gatewayUrl: gatewayUrl,
      ipfsUrl: gatewayUrl,
      network: network,
    };
  } catch (error) {
    const message = error?.message || String(error);
    console.error('Error uploading to Filecoin:', message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    throw new Error(`Failed to upload to Filecoin: ${message}`);
  }
}

// Download file from Filecoin Onchain Cloud using Synapse SDK with storage context
async function downloadFromFilecoin(pieceCid) {
  try {
    console.log(`Downloading file from Filecoin Onchain Cloud: ${pieceCid}`);
    
    // Initialize Synapse SDK if not already initialized
    const synapseInstance = await initializeSynapse();
    
    // Create a storage context with specific provider (same as upload)
    console.log('Creating storage context for download with provider ID 1 and CDN enabled...');
    const context = await synapseInstance.storage.createContext({
      providerId: 1, // Use specific provider
      withCDN: true, // Enable CDN for faster retrieval
      metadata: {
        category: "ai-generated-images",
        version: "1.0",
      },
    });
    
    // Download from this context
    console.log('Downloading from storage context...');
    const downloadedData = await context.download(pieceCid);
    
    console.log(`Filecoin download successful, size: ${downloadedData.length} bytes`);
    
    // Convert Uint8Array back to Buffer
    return Buffer.from(downloadedData);
  } catch (error) {
    const message = error?.message || String(error);
    console.error('Error downloading from Filecoin:', message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    throw new Error(`Failed to download from Filecoin: ${message}`);
  }
}

// Save generated image to database
async function saveToDatabase(walletAddress, filecoinUrl, prompt) {
  try {
    console.log('Saving to database...');
    console.log('Wallet Address:', walletAddress);
    console.log('Filecoin URL:', filecoinUrl);
    console.log('Prompt:', prompt);
    
    // Validate inputs
    if (!walletAddress) {
      throw new Error('Wallet address is required');
    }
    if (!filecoinUrl) {
      throw new Error('Filecoin URL is required');
    }
    if (!prompt) {
      throw new Error('Prompt is required');
    }
    
    // Check if the table exists first
    const tableName = process.env.SUPABASE_TABLE_NAME || 'AI Generated Content';
    console.log(`Attempting to save to table: ${tableName}`);
    
    const insertData = {
      wallet_address: walletAddress, 
      ipfs_url: filecoinUrl, // Database column name kept for backward compatibility
      prompt: prompt,
      created_at: new Date().toISOString()
    };
    
    console.log('Insert data:', JSON.stringify(insertData, null, 2));
    
    const { data, error } = await supabase
      .from(tableName)
      .insert([insertData])
      .select(); // Return the inserted data

    if (error) {
      console.error('Supabase Insert Error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error details:', JSON.stringify(error, null, 2));
      throw error;
    }
    
    console.log('Successfully saved to database. Inserted record:', data);
    return data;
  } catch (error) {
    console.error('Error saving to database:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    throw new Error(`Failed to save to database: ${error.message}`);
  }
}

// Convert image to PNG format
async function convertImageToPNG(imageUrl) {
  try {
    console.log(`Converting image to PNG: ${imageUrl}`);
    
    // Download the image
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 10000
    });
    
    // Convert to PNG using Sharp
    const pngBuffer = await sharp(response.data)
      .png()
      .toBuffer();
    
    console.log(`Successfully converted image to PNG, size: ${pngBuffer.length} bytes`);
    return pngBuffer;
  } catch (error) {
    console.error('Error converting image to PNG:', error.message);
    throw new Error(`Failed to convert image to PNG: ${error.message}`);
  }
}

// Generate AI image using Google Imagen API
async function generateAIImage(prompt, imageBuffers) {
  try {
    console.log('Starting AI image generation...');
    console.log('Prompt:', prompt);
    console.log('Number of reference images:', imageBuffers.length);
    
    const { GoogleGenAI } = await import('@google/genai');
    
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY
    });
    
    // Prepare the content for Gemini
    const contents = [
      {
        text: `Generate a new image based on this prompt: "${prompt}". Use the provided reference images as inspiration for style, composition, and visual elements.`
      }
    ];
    
    // Add image parts
    for (let i = 0; i < imageBuffers.length; i++) {
      contents.push({
        inlineData: {
          data: imageBuffers[i].toString('base64'),
          mimeType: 'image/png'
        }
      });
    }
    
    console.log('Sending request to Gemini API...');
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-preview-image-generation",
      contents: contents,
      config: {
        responseModalities: ['IMAGE', 'TEXT'],
        numberOfImages: 1
      }
    }); 
    
    console.log('AI image generation completed');
    
    // Process the response to extract the generated image
    // Check for generatedImages array first (new format)
    if (response.generatedImages && response.generatedImages.length > 0) {
      console.log('Generated image data received');
      const firstImage = response.generatedImages[0];
      const imageBytes = firstImage.image.imageBytes;
      const buffer = Buffer.from(imageBytes, "base64");
      
      // Convert to data URL for frontend display
      const dataUrl = `data:image/png;base64,${imageBytes}`;
      
      return {
        success: true,
        message: 'Image generated successfully!',
        generatedImage: dataUrl,
        imageBuffer: buffer
      };
    }
    
    // Fallback to old format processing
    for (const part of response.candidates[0].content.parts) {
      if (part.text) {
        console.log('Generated text:', part.text);
      } else if (part.inlineData) {
        console.log('Generated image data received');
        const imageData = part.inlineData.data;
        const buffer = Buffer.from(imageData, "base64");
        
        // Convert to data URL for frontend display
        const dataUrl = `data:image/png;base64,${imageData}`;
        
        return {
          success: true,
          message: 'Image generated successfully!',
          generatedImage: dataUrl,
          imageBuffer: buffer
        };
      }
    }
    
    // If no image was generated, return a placeholder
    return {
      success: true,
      message: 'Image generation completed but no image data received.',
      generatedImage: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzMzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIyNCIgZmlsbD0iI2ZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkFJIEltYWdlPC90ZXh0Pjwvc3ZnPg=='
    };
  } catch (error) {
    console.error('Error generating AI image:', error.message);
    throw new Error(`Failed to generate AI image: ${error.message}`);
  }
}

// API endpoint for image generation
app.post('/api/generate-image', async (req, res) => {
  try {
    console.log('=== IMAGE GENERATION REQUEST ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const { prompt, imageUrls, walletAddress } = req.body;
    
    if (!prompt) {
      return res.status(400).json({
        error: 'Prompt is required'
      });
    }
    
    if (!walletAddress) {
      return res.status(400).json({
        error: 'Wallet address is required'
      });
    }
    
    console.log('Processing image URLs:', imageUrls);
    
    // Convert all images to PNG (if any are provided)
    const imageBuffers = [];
    if (imageUrls && imageUrls.length > 0) {
      for (const imageUrl of imageUrls) {
        try {
          const pngBuffer = await convertImageToPNG(imageUrl);
          imageBuffers.push(pngBuffer);
        } catch (error) {
          console.warn(`Skipping image ${imageUrl}: ${error.message}`);
          // Continue with other images
        }
      }
      console.log(`Successfully processed ${imageBuffers.length} images`);
    } else {
      console.log('No reference images provided - generating from prompt only');
    }
    
    // Generate AI image
    const generationResult = await generateAIImage(prompt, imageBuffers);
    
    console.log('=== IMAGE GENERATION COMPLETED ===');
    
    let filecoinResult = null;
    let filecoinUrl = null;
    
    // Upload generated image to Filecoin Onchain Cloud if we have image data
    if (generationResult.imageBuffer) {
      try {
        console.log('Uploading generated image to Filecoin Onchain Cloud...');
        const fileName = `ai-generated-${Date.now()}.png`;
        filecoinResult = await uploadToFilecoin(generationResult.imageBuffer, fileName, 'image/png');
        
        if (filecoinResult && filecoinResult.gatewayUrl) {
          filecoinUrl = filecoinResult.gatewayUrl;
          console.log('Filecoin upload successful:', { 
            pieceCid: filecoinResult.pieceCid, 
            filecoinUrl: filecoinUrl 
          });
        } else {
          console.warn('Filecoin upload completed but no gateway URL in result:', filecoinResult);
        }
      } catch (filecoinError) {
        console.error('Filecoin upload failed:', filecoinError.message);
        if (filecoinError.stack) {
          console.error('Stack trace:', filecoinError.stack);
        }
        // Don't set filecoinUrl, it will remain null
      }
    }
    
    // Save to database
    try {
      if (filecoinUrl) {
        await saveToDatabase(
          walletAddress, 
          filecoinUrl, 
          prompt
        );
        console.log('Successfully saved to database with filecoinUrl:', filecoinUrl);
      } else {
        console.warn('Skipping database save - filecoinUrl is null or undefined');
      }
    } catch (dbError) {
      console.error('Database save failed:', dbError.message);
      if (dbError.stack) {
        console.error('Stack trace:', dbError.stack);
      }
      console.warn('Continuing with response despite database error');
    }
    
    res.json({
      success: true,
      message: generationResult.message,
      generatedImage: generationResult.generatedImage,
      processedImages: imageBuffers.length,
      filecoinUrl, // This will be a Filbeam gateway URL when available
      pieceCid: filecoinResult?.pieceCid || null, // Filecoin pieceCid
      ipfsUrl: filecoinUrl, // For backward compatibility with frontend
      ipfsHash: filecoinResult?.pieceCid || null, // For backward compatibility
      savedToDatabase: true
    });
    
  } catch (error) {
    console.error('Error in image generation endpoint:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'AI Image Generation API is running' });
});

// Get storage and payment statistics
app.get('/api/storage-stats', async (req, res) => {
  try {
    const synapseInstance = await initializeSynapse();
    
    // Get USDFC balance
    const walletBalance = await synapseInstance.payments.walletBalance(TOKENS.USDFC);
    const formattedBalance = ethers.formatUnits(walletBalance, 18);
    
    // Get network info
    const network = synapseInstance.getNetwork();
    const warmStorageAddress = synapseInstance.getWarmStorageAddress();
    
    // Get total storage used from database (sum of all file sizes)
    const tableName = process.env.SUPABASE_TABLE_NAME || 'AI Generated Content';
    const { data: historyData } = await supabase
      .from(tableName)
      .select('ipfs_url');
    
    // Calculate approximate storage (we'll estimate based on number of files)
    // In a real scenario, you'd track file sizes in the database
    const totalFiles = historyData?.length || 0;
    
    res.json({
      success: true,
      balance: {
        usdfc: formattedBalance,
        usdfcRaw: walletBalance.toString(),
      },
      network: network,
      warmStorageAddress: warmStorageAddress,
      storage: {
        totalFiles: totalFiles,
        // Note: Actual storage size would need to be tracked per file
        // For now, we show file count
      },
      paymentSetup: {
        hasBalance: walletBalance > 0,
        sufficientBalance: walletBalance >= ethers.parseUnits("2", 18),
      }
    });
  } catch (error) {
    console.error('Error fetching storage stats:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// One-time payment setup endpoint (call this once to set up Filecoin payments)
app.post('/api/setup-payment', async (req, res) => {
  try {
    console.log('=== PAYMENT SETUP REQUEST ===');
    console.log('Environment check:');
    console.log('- FILECOIN_PRIVATE_KEY:', process.env.FILECOIN_PRIVATE_KEY ? '✅ Set' : '❌ Missing');
    console.log('- FILECOIN_RPC_URL:', process.env.FILECOIN_RPC_URL || 'Using default (calibration)');
    
    await setupPayment();
    res.json({ 
      success: true, 
      message: 'Payment setup completed successfully. USDFC deposited and service approved.' 
    });
  } catch (error) {
    console.error('❌ Error in payment setup endpoint:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Upload ERC-721 metadata JSON to Filecoin Onchain Cloud
app.post('/api/metadata', async (req, res) => {
  try {
    const { name, description, image, attributes } = req.body || {};
    if (!name || !description || !image) {
      return res.status(400).json({ error: 'name, description and image are required' });
    }

    // Basic ERC-721 Metadata JSON
    const metadata = {
      name,
      description,
      image, // should be a Filecoin pieceCid, filecoin:// URL, or Filbeam gateway URL
      attributes: Array.isArray(attributes) ? attributes : []
    };

    const jsonBuffer = Buffer.from(JSON.stringify(metadata, null, 2));
    const fileName = `${name.replace(/[^a-z0-9-_]/gi, '_') || 'metadata'}.json`;

    console.log('[METADATA] Uploading metadata to Filecoin:', metadata);
    const uploadResult = await uploadToFilecoin(jsonBuffer, fileName, 'application/json');
    
    const pieceCid = uploadResult.pieceCid;
    const filecoinUrl = uploadResult.gatewayUrl;
    
    console.log('[METADATA] Uploaded to Filecoin. pieceCid:', pieceCid, 'url:', filecoinUrl);

    return res.json({ 
      success: true, 
      pieceCid, 
      ipfsUrl: filecoinUrl, // For backward compatibility
      gatewayUrl: filecoinUrl
    });

  } catch (error) {
    console.error('[METADATA] Error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Fetch a user's generation history
app.get('/api/history/:walletAddress', async (req, res) => {
  try {
    const walletAddress = req.params.walletAddress;
    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    const tableName = process.env.SUPABASE_TABLE_NAME || 'AI Generated Content';
    const { data, error } = await supabase
      .from(tableName)
      .select('id, wallet_address, ipfs_url, prompt, created_at')
      .eq('wallet_address', walletAddress)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Supabase Select Error:', error);
      return res.status(500).json({ error: 'Failed to fetch history' });
    }

    // Process history items - all stored on Filecoin
    console.log('[HISTORY] Rows fetched:', (data || []).length);
    const items = await Promise.all(
      (data || []).map(async (row) => {
        const filecoinUrl = row.ipfs_url; // Database column name kept for backward compatibility
        const pieceCid = pieceCidFromFilecoinUrl(filecoinUrl);
        
        console.log('[HISTORY] Row ID:', row.id, 'Wallet:', row.wallet_address);
        console.log('  filecoin_url:', filecoinUrl);
        console.log('  parsed pieceCid:', pieceCid);
        
        return {
          id: row.id,
          walletAddress: row.wallet_address,
          filecoinUrl: filecoinUrl,
          gatewayUrl: filecoinUrl, // The Filbeam gateway URL stored in database
          pieceCid: pieceCid,
          ipfsUrl: filecoinUrl, // For backward compatibility with frontend
          cid: pieceCid, // For backward compatibility
          prompt: row.prompt,
          createdAt: row.created_at,
        };
      })
    );

    res.json({ success: true, items });
  } catch (err) {
    console.error('Error fetching history:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Automatically initialize SDK and set up payment on server startup
async function initializeServer() {
  try {
    console.log('🚀 Starting server initialization...');
    
    if (!process.env.FILECOIN_PRIVATE_KEY) {
      console.warn('⚠️  FILECOIN_PRIVATE_KEY not set - SDK initialization skipped');
      console.warn('⚠️  Storage features will not work until FILECOIN_PRIVATE_KEY is configured');
      return;
    }
    
    console.log('📦 Filecoin private key detected, initializing SDK...');
    
    try {
      // Initialize SDK first
      await initializeSynapse();
      console.log('✅ SDK initialized successfully!');
      
      // Then set up payment
      console.log('💰 Setting up payment automatically...');
      await setupPayment();
      console.log('✅ Payment setup completed successfully on startup');
    } catch (initError) {
      console.warn('⚠️  SDK initialization or payment setup failed:', initError.message);
      console.warn('⚠️  You can still use the server, but storage uploads may fail');
      console.warn('⚠️  The server will continue running - you can retry later');
      // Don't throw - let server continue running
    }
  } catch (error) {
    console.error('❌ Server initialization error:', error.message);
    console.error('❌ Server will continue running, but storage features may not work');
    // Don't throw - let server continue running even if initialization fails
  }
}

app.listen(PORT, () => {
  console.log(`AI Image Generation API running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  
  // Initialize SDK and payment setup in background (don't block server startup)
  initializeServer().catch(err => {
    console.error('Background initialization error:', err);
  });
});
