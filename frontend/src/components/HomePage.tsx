import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { ImageGenerationPage } from '../pages/ImageGenerationPage';
import FigurineGenerationPage from '../pages/FigurineGenerationPage';
import { HistoryPage } from '../pages/HistoryPage';
import { CustomPromptsPage } from '../pages/CustomPromptsPage';
import { BrowsePromptsPage } from '../pages/BrowsePromptsPage';
import './HomePage.css';

export function HomePage() {
  const [currentPage, setCurrentPage] = useState<'home' | 'image' | 'figurine' | 'history' | 'custom-prompts' | 'browse-prompts'>('home');

  if (currentPage === 'image') {
    return <ImageGenerationPage onBack={() => setCurrentPage('home')} />;
  }

  if (currentPage === 'figurine') {
    return <FigurineGenerationPage onBack={() => setCurrentPage('home')} />;
  }

  if (currentPage === 'history') {
    return <HistoryPage onBack={() => setCurrentPage('home')} />;
  }

  if (currentPage === 'custom-prompts') {
    return <CustomPromptsPage onBack={() => setCurrentPage('home')} />;
  }

  if (currentPage === 'browse-prompts') {
    return <BrowsePromptsPage onBack={() => setCurrentPage('home')} />;
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
      <main>
        <div className="container">
          {/* Hero Section */}
          <div className="hero-section">
            <h1>Transform Your NFTs</h1>
            <p>Create stunning AI-generated art from your digital collection</p>
          </div>

          {/* Main Action - AI Images */}
          <div className="main-action">
            <div className="primary-action-card" onClick={() => setCurrentPage('image')}>
              <div className="primary-icon">🎨</div>
              <h2>AI Image Generation</h2>
              <p>Transform your NFTs into stunning AI-generated artwork with custom prompts and style transfer</p>
              <div className="primary-action-button">Start Generating →</div>
            </div>
          </div>

          {/* All Features Grid */}
          <div className="features-section">
            <h2 className="section-title">All Features</h2>
            <div className="features-grid">
              <div className="feature-card" onClick={() => setCurrentPage('figurine')}>
                <div className="feature-icon">🧸</div>
                <h3>3D Figurines</h3>
                <p>Create premium 3D figurine-style images</p>
              </div>

              <div className="feature-card" onClick={() => setCurrentPage('history')}>
                <div className="feature-icon">🗂️</div>
                <h3>Recent Works</h3>
                <p>View your generation history</p>
              </div>

              <div className="feature-card" onClick={() => setCurrentPage('custom-prompts')}>
                <div className="feature-icon">💡</div>
                <h3>Create Prompt</h3>
                <p>Monetize your AI prompts</p>
              </div>

              <div className="feature-card" onClick={() => setCurrentPage('browse-prompts')}>
                <div className="feature-icon">🔍</div>
                <h3>Browse Prompts</h3>
                <p>Discover prompts marketplace</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}