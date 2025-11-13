import { useAccount } from 'wagmi';
import { useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { UsePromptPage } from './UsePromptPage';
import './GenerationPage.css';
import '../components/HomePage.css';

interface BrowsePromptsPageProps {
  onBack: () => void;
}

interface Prompt {
  id: string;
  owner_address: string;
  price_in_tfil: number;
  before_image_url: string | null;
  after_image_url: string | null;
  created_at: string;
}

export function BrowsePromptsPage({ onBack }: BrowsePromptsPageProps) {
  const { isConnected } = useAccount();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);

  useEffect(() => {
    if (isConnected) {
      fetchPrompts();
    }
  }, [isConnected]);

  const fetchPrompts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('https://crafture-topi.onrender.com/api/prompts');
      if (!response.ok) {
        throw new Error('Failed to fetch prompts');
      }
      const data = await response.json();
      setPrompts(data.prompts || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (selectedPrompt) {
    return (
      <UsePromptPage 
        prompt={selectedPrompt}
        onBack={() => setSelectedPrompt(null)}
        onHome={onBack}
      />
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
              <span className="breadcrumb-current">Browse Custom Prompts</span>
            </div>
            <h1>Browse Custom Prompts</h1>
            <p>Select a prompt to use with your NFTs. Prompts are encrypted until you pay to use them.</p>
          </div>

          {!isConnected ? (
            <div className="connect-prompt">
              <div className="prompt-card">
                <h2>Connect Your Wallet</h2>
                <p>Connect to browse and use custom prompts</p>
              </div>
            </div>
          ) : (
            <div className="content-section" style={{ gridTemplateColumns: '1fr' }}>
              {loading && (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                  <div className="loading-spinner" style={{ margin: '0 auto' }}></div>
                  <p style={{ color: '#94a3b8', marginTop: '1rem' }}>Loading prompts...</p>
                </div>
              )}

              {error && (
                <div className="error-message">
                  <p>❌ {error}</p>
                  <button className="retry-button" onClick={fetchPrompts}>Retry</button>
                </div>
              )}

              {!loading && !error && prompts.length === 0 && (
                <div className="prompt-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
                  <h2>No Prompts Available</h2>
                  <p>No custom prompts have been created yet. Be the first to create one!</p>
                </div>
              )}

              {!loading && !error && prompts.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                  {prompts.map((prompt) => (
                    <div
                      key={prompt.id}
                      className="nft-card"
                      onClick={() => setSelectedPrompt(prompt)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
                        {prompt.before_image_url ? (
                          <img
                            src={prompt.before_image_url}
                            alt="Before"
                            style={{
                              width: '100%',
                              height: '120px',
                              objectFit: 'cover',
                              borderRadius: '8px',
                              border: '1px solid rgba(255, 255, 255, 0.1)'
                            }}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div style={{
                            width: '100%',
                            height: '120px',
                            background: 'rgba(0, 0, 0, 0.3)',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#64748b',
                            fontSize: '0.85rem'
                          }}>
                            No Before Image
                          </div>
                        )}
                        {prompt.after_image_url ? (
                          <img
                            src={prompt.after_image_url}
                            alt="After"
                            style={{
                              width: '100%',
                              height: '120px',
                              objectFit: 'cover',
                              borderRadius: '8px',
                              border: '1px solid rgba(255, 255, 255, 0.1)'
                            }}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div style={{
                            width: '100%',
                            height: '120px',
                            background: 'rgba(0, 0, 0, 0.3)',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#64748b',
                            fontSize: '0.85rem'
                          }}>
                            No After Image
                          </div>
                        )}
                      </div>
                      <div className="nft-info">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <div style={{ color: '#60a5fa', fontSize: '1.2rem', fontWeight: 700 }}>
                            {prompt.price_in_tfil} tFIL
                          </div>
                          <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                            {new Date(prompt.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div style={{ color: '#cbd5e1', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                          Owner: {prompt.owner_address.slice(0, 6)}...{prompt.owner_address.slice(-4)}
                        </div>
                        <div style={{
                          background: 'rgba(96, 165, 250, 0.1)',
                          border: '1px solid rgba(96, 165, 250, 0.3)',
                          borderRadius: '6px',
                          padding: '0.5rem',
                          textAlign: 'center',
                          color: '#60a5fa',
                          fontSize: '0.9rem',
                          fontWeight: 500,
                          marginTop: '0.5rem'
                        }}>
                          Click to Use →
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

