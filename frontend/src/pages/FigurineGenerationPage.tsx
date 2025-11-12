import { useAccount } from 'wagmi';
import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { NFTGallery } from '../components/NFTGallery';
import './GenerationPage.css';
import '../components/HomePage.css';

interface FigurineGenerationPageProps {
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

const FIXED_PROMPT = `Using the model, create a 1/7 scale commercialized figurine of the characters in the picture, in a realistic style, in a real environment. The figurine is placed on a computer desk. The figurine has a round transparent acrylic base, with no text on the base. The content on the computer screen is the Zbrush modeling process of this figurine. Next to the computer screen is a BANDAI-style toy packaging box printed with the original artwork. The packaging features two-dimensional flat illustrations.`;

export default function FigurineGenerationPage({ onBack }: FigurineGenerationPageProps) {
  const { isConnected, address } = useAccount();
  const [selectedNFTs, setSelectedNFTs] = useState<NFT[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isGenerateDisabled = selectedNFTs.length === 0 || isGenerating;

  const handleGenerateImage = async () => {
    if (isGenerateDisabled) return;

    console.log('=== STARTING FIGURINE IMAGE GENERATION ===');
    console.log('Selected NFTs:', selectedNFTs);
    console.log('Fixed Prompt:', FIXED_PROMPT);

    setIsGenerating(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const imageUrls = selectedNFTs.map(nft => nft.image_url);
      
      const response = await fetch('http://localhost:3001/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: FIXED_PROMPT,
          imageUrls,
          walletAddress: address
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to generate image');
      }

      const data = await response.json();
      console.log('Generation response:', data);
      console.log('Gateway URL:', data.gatewayUrl);
      console.log('Saved to database:', data.savedToDatabase);
      if (data.success) {
        setGeneratedImage(data.generatedImage);
      } else {
        throw new Error(data.message || 'Generation failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error('Error generating image:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
      console.log('=== FIGURINE IMAGE GENERATION COMPLETED ===');
    }
  };

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
            <button onClick={() => setGeneratedImage(null)} className="breadcrumb-link">← Back</button>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-current">3D Figurine Result</span>
          </div>
          <h1>3D Figurine Image</h1>
          <p>Your figurine-style image is ready!</p>
        </div>
        <div className="content-section" style={{ gridTemplateColumns: '1fr' }}>
          <div className="result-container">
            <div className="generated-image-container">
              <img src={generatedImage} alt="Generated Figurine" className="generated-image" />
            </div>
            <div className="result-actions">
              <button className="generate-button" onClick={() => setGeneratedImage(null)}>Generate Another</button>
              <button className="secondary-button" onClick={onBack}>Back to Home</button>
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
          <span className="breadcrumb-current">3D Figurine</span>
        </div>
        <h1>Create Your 3D NFT Figurine</h1>
        <p>Select NFTs and generate a figurine-style image with a preselected prompt</p>
      </div>

      {!isConnected ? (
        <div className="connect-prompt">
          <div className="prompt-card">
            <h2>Connect Your Wallet</h2>
            <p>Connect to view your NFTs and create figurine-style images</p>
          </div>
        </div>
      ) : (
        <div className="content-section">
          <div className="nft-selection">
            <h2>Your NFTs</h2>
            <p>Choose one or more NFTs to use as the base for the figurine</p>
            <NFTGallery onSelectionChange={setSelectedNFTs} selectionMode={true} />
          </div>
          <div className="generation-panel">
            <h3>Figurine Generation</h3>
            {error && (
              <div className="error-message">
                <p>❌ {error}</p>
                <button className="retry-button" onClick={() => setError(null)}>Dismiss</button>
              </div>
            )}
            <button className={`generate-button ${isGenerateDisabled ? 'disabled' : ''}`} disabled={isGenerateDisabled} onClick={handleGenerateImage}>
              {isGenerating ? (<><span className="loading-spinner"></span>Generating Figurine…</>) : 'Generate Figurine'}
            </button>
            {selectedNFTs.length === 0 && (
              <p className="validation-message">Please select at least one NFT to proceed</p>
            )}
          </div>
        </div>
      )}
        </div>
      </main>
    </div>
  );
}


