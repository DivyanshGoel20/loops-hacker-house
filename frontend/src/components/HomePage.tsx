// import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
// import { ImageGenerationPage } from '../pages/ImageGenerationPage';
// import { HistoryPage } from '../pages/HistoryPage';
import './HomePage.css';

export function HomePage() {
  // const [currentPage, setCurrentPage] = useState('home');

  // The following routes/pages are not yet part of the codebase.
  // Commenting them out to avoid import errors. Keep the UI below.
  // if (currentPage === 'image') {
  //   return <ImageGenerationPage onBack={() => setCurrentPage('home')} />;
  // }
  // if (currentPage === 'figurine') {
  //   const Figurine = lazy(() => import('../pages/FigurineGenerationPage'));
  //   return (
  //     <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', color: 'white' }}>Loading Figurine Builder…</div>}>
  //       <Figurine onBack={() => setCurrentPage('home')} />
  //     </Suspense>
  //   );
  // }
  // if (currentPage === 'history') {
  //   return <HistoryPage onBack={() => setCurrentPage('home')} />;
  // }

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
          <div className="main-feature">
            <div className="featured-card figurine-card" onClick={() => alert('Figurine Builder coming soon')}> 
              <div className="featured-badge">⭐ Featured</div>
              <div className="card-icon">🧸</div>
              <h2>3D NFT Figurines</h2>
              <p>Transform your NFTs into premium 3D figurine-style images with professional lighting and presentation</p>
              <div className="card-features">
                <span>Premium acrylic base</span>
                <span>Professional desk scene</span>
                <span>Packaging mockup</span>
                <span>Studio lighting</span>
              </div>
              <div className="cta-button">Create Figurine →</div>
            </div>
          </div>

          <div className="secondary-options">
            <div className="option-card image-card" onClick={() => alert('AI Images coming soon')}>
              <div className="card-icon">🎨</div>
              <h2>AI Images</h2>
              <p>Generate stunning images inspired by your NFTs using advanced AI</p>
              <div className="card-features">
                <span>Style Transfer</span>
                <span>Art Generation</span>
                <span>High Resolution</span>
              </div>
            </div>

            <div className="option-card history-card" onClick={() => alert('History coming soon')}>
              <div className="card-icon">🗂️</div>
              <h2>Recent Works</h2>
              <p>Browse your generated images and prompts</p>
              <div className="card-features">
                <span>View History</span>
                <span>Open via Gateway</span>
                <span>Mint</span>
              </div>
            </div>
          </div>
        </div>
      </main>

    </div>
  );
}