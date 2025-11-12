import { useAccount } from 'wagmi';
import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { NFTGallery } from '../components/NFTGallery';
import './GenerationPage.css';

interface ImageGenerationPageProps {
  onBack: () => void;
}

interface NFT {
  identifier: string;
  name: string;
  description: string;
  image_url: string;
  collection: string;
  contract: string;
  token_standard: string;
  chain: string;
}

export function ImageGenerationPage({ onBack }: ImageGenerationPageProps) {
  const { isConnected, address } = useAccount();
  const [selectedNFTs, setSelectedNFTs] = useState<NFT[]>([]);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isGenerateDisabled = !prompt.trim() || selectedNFTs.length === 0 || isGenerating;

  const handleGenerateImage = async () => {
    if (isGenerateDisabled) return;

    console.log('=== STARTING AI IMAGE GENERATION ===');
    console.log('Selected NFTs:', selectedNFTs);
    console.log('Prompt:', prompt);
    console.log('Image URLs:');
    selectedNFTs.forEach((nft, index) => {
      console.log(`${index + 1}. ${nft.name || `#${nft.identifier}`}: ${nft.image_url}`);
    });

    setIsGenerating(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const imageUrls = selectedNFTs.length > 0 ? selectedNFTs.map(nft => nft.image_url) : [];
      
      console.log('Sending request to backend API...');
      const response = await fetch('http://localhost:3001/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          imageUrls: imageUrls,
          walletAddress: address
        })
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate image');
      }

      const data = await response.json();
      console.log('Generation response:', data);
      
      if (data.success) {
        setGeneratedImage(data.generatedImage);
        console.log('Image generated successfully!');
      } else {
        throw new Error(data.message || 'Generation failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error('Error generating image:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
      console.log('=== AI IMAGE GENERATION COMPLETED ===');
    }
  };

  // If we have a generated image, show the results page
  if (generatedImage) {
    return (
      <div className="homepage">
        <header className="topbar">
          <div className="container topbar-content">
            <div className="brand">
              <div className="brand-name">Crafture</div>
              <div className="tagline">Turn Your Digital Collection into AI‑Generated Masterpieces.</div>
            </div>
            <div className="wallet">
              <ConnectButton />
            </div>
          </div>
        </header>
        <main className="container">
          <div className="generation-page">
            <div className="page-header">
          <div className="breadcrumb">
            <button onClick={() => setGeneratedImage(null)} className="breadcrumb-link">← Back to Generation</button>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-current">Generated Image</span>
          </div>
          <h1>Generated AI Image</h1>
          <p>Your AI-generated image is ready!</p>
        </div>
        
        <div className="content-section">
          <div className="result-container">
            <div className="generated-image-container">
              <img 
                src={generatedImage} 
                alt="Generated AI Image" 
                className="generated-image"
              />
            </div>
            <div className="result-actions">
              <button 
                className="generate-button"
                onClick={() => setGeneratedImage(null)}
              >
                Generate Another Image
              </button>
              <button 
                className="secondary-button"
                onClick={onBack}
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="homepage">
      <header className="topbar">
        <div className="container topbar-content">
          <div className="brand">
            <div className="brand-name">Crafture</div>
            <div className="tagline">Turn Your Digital Collection into AI‑Generated Masterpieces.</div>
          </div>
          <div className="wallet">
            <ConnectButton />
          </div>
        </div>
      </header>
      <main className="container">
        <div className="generation-page">
      <div className="page-header">
        <div className="breadcrumb">
          <button onClick={onBack} className="breadcrumb-link">← Back to Home</button>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">AI Images</span>
        </div>
        <h1>AI Image Generation</h1>
        <p>Select NFTs to generate stunning AI-powered images</p>
      </div>

      {!isConnected ? (
        <div className="connect-prompt">
          <div className="prompt-card">
            <h2>Connect Your Wallet</h2>
            <p>Please connect your wallet to view your NFTs and start generating AI images</p>
          </div>
        </div>
      ) : (
        <div className="content-section">
          <div className="nft-selection">
            <h2>Your NFTs</h2>
            <p>Choose at least one NFT to use as inspiration for AI image generation (required)</p>
            <NFTGallery 
              onSelectionChange={setSelectedNFTs}
              selectionMode={true}
            />
          </div>
          
          <div className="generation-panel">
            <h3>AI Image Generation</h3>
            <div className="prompt-section">
              <label htmlFor="image-prompt">Describe the image you want to generate:</label>
              <textarea
                id="image-prompt"
                className="prompt-textarea"
                placeholder="e.g., A futuristic cityscape with neon lights, inspired by cyberpunk aesthetics..."
                rows={4}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>
            {error && (
              <div className="error-message">
                <p>❌ {error}</p>
                <button 
                  className="retry-button"
                  onClick={() => setError(null)}
                >
                  Dismiss
                </button>
              </div>
            )}
            
            <button 
              className={`generate-button ${isGenerateDisabled ? 'disabled' : ''}`}
              onClick={handleGenerateImage}
              disabled={isGenerateDisabled}
            >
              {isGenerating ? (
                <>
                  <span className="loading-spinner"></span>
                  Generating AI Image...
                </>
              ) : (
                'Generate AI Images'
              )}
            </button>
            
            {!prompt.trim() && (
              <p className="validation-message">
                Please enter a prompt to describe the image you want to generate
              </p>
            )}
            
            {selectedNFTs.length === 0 && (
              <p className="validation-message">
                Please select at least one NFT to use as inspiration for your generated image
              </p>
            )}
          </div>
        </div>
      )}
        </div>
      </main>
    </div>
  );
}
