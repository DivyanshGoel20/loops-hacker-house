import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useWriteContract, useWaitForTransactionReceipt, useChainId, useSwitchChain } from 'wagmi';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { filecoinCalibration } from '../web3/rainbow';
import './GenerationPage.css';
import '../components/HomePage.css';

interface HistoryPageProps {
  onBack: () => void;
}

interface HistoryItem {
  id: number;
  walletAddress: string;
  ipfsUrl: string;
  filecoinUrl?: string;
  cid: string;
  gatewayUrl: string | null;
  accessUrl?: string | null;
  prompt: string;
  createdAt: string;
}

export function HistoryPage({ onBack }: HistoryPageProps) {
  const { isConnected, address } = useAccount();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!address) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`http://localhost:3001/api/history/${address}`);
        if (!res.ok) throw new Error('Failed to fetch history');
        const data = await res.json();
        setItems(data.items || []);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [address]);

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
          <span className="breadcrumb-current">Recent Works</span>
        </div>
        <h1>Recent Works</h1>
        <p>View images you generated along with their prompts</p>
      </div>

      {!isConnected ? (
        <div className="connect-prompt">
          <div className="prompt-card">
            <h2>Connect Your Wallet</h2>
            <p>Connect to view your generation history</p>
          </div>
        </div>
      ) : (
        <div className="content-section" style={{ gridTemplateColumns: '1fr' }}>
          {loading && <p>Loading history…</p>}
          {error && <p className="error-message">{error}</p>}
          {!loading && !error && (
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              {items.length === 0 && (
                <p>No items yet. Generate your first image!</p>
              )}
              {items.map((item) => {
                // Use gatewayUrl, ipfsUrl, or filecoinUrl (in that order of preference)
                const imageUrl = item.gatewayUrl || item.ipfsUrl || item.filecoinUrl;
                
                return (
                  <div key={item.id} className="generated-image-container" style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '1rem', alignItems: 'start' }}>
                    <div style={{ width: '240px' }}>
                      {imageUrl ? (
                        <img 
                          src={imageUrl} 
                          alt={item.prompt} 
                          className="generated-image" 
                          style={{ maxHeight: '240px', objectFit: 'cover', width: '100%', borderRadius: '8px' }}
                          onError={(e) => {
                            console.error('Failed to load image:', imageUrl);
                            e.currentTarget.style.display = 'none';
                            const errorDiv = document.createElement('div');
                            errorDiv.textContent = 'Image unavailable';
                            errorDiv.style.cssText = 'height: 240px; display: flex; align-items: center; justify-content: center; color: #94a3b8;';
                            e.currentTarget.parentElement?.appendChild(errorDiv);
                          }}
                        />
                      ) : (
                        <div style={{ height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Image unavailable</div>
                      )}
                    </div>
                    <div>
                      <div style={{ marginBottom: '0.5rem' }}>
                        <p style={{ color: '#cbd5e1', fontSize: '14px', marginBottom: '0.5rem' }}><strong>Prompt:</strong> {item.prompt}</p>
                        <p style={{ color: '#94a3b8', fontSize: '12px' }}>{new Date(item.createdAt).toLocaleString()}</p>
                      </div>
                      {imageUrl && (
                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                          <MintButton imageUrl={imageUrl} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
        </div>
      </main>
    </div>
  );
}

// Simple mint modal + metadata uploader
function MintButton({ imageUrl }: { imageUrl: string }) {
  const { data: txHash, isPending, writeContract, error: writeError } = useWriteContract();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metadataUrl, setMetadataUrl] = useState<string | null>(null);

  const handleOpenForFilecoin = async () => {
    try {
      if (chainId !== filecoinCalibration.id) {
        await switchChain({ chainId: filecoinCalibration.id });
      }
    } catch {}
    setOpen(true);
  };

  const onMint = async () => {
    setLoading(true);
    setError(null);
    setMetadataUrl(null);
    try {
      // Create ERC-721 metadata JSON locally
      const metadata = {
        name: name.trim(),
        description: description.trim(),
        image: imageUrl // Use the IPFS URL from Supabase
      };

      // Convert to JSON string and encode as base64 data URI
      const jsonString = JSON.stringify(metadata, null, 2);
      const base64Encoded = btoa(unescape(encodeURIComponent(jsonString)));
      const dataUri = `data:application/json;base64,${base64Encoded}`;

      console.log('Created metadata:', metadata);
      console.log('Data URI:', dataUri);
      setMetadataUrl(dataUri);

      // Switch to Filecoin Calibration network if needed
      if (chainId !== filecoinCalibration.id) {
        try { 
          await switchChain({ chainId: filecoinCalibration.id }); 
        } catch (switchError) {
          console.error('Failed to switch chain:', switchError);
          throw new Error('Please switch to Filecoin Calibration network');
        }
      }

      const contractAddress = '0x06f5E73C1E1671F44a55A665592a8F4D65f2E010';
      
      // Send data URI directly to contract (no IPFS upload needed)
      try {
        writeContract({
          abi: [
            {
              "inputs": [ { "internalType": "string", "name": "tokenURI", "type": "string" } ],
              "name": "mintNFT",
              "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ],
              "stateMutability": "nonpayable",
              "type": "function"
            }
          ],
          address: contractAddress as `0x${string}`,
          functionName: 'mintNFT',
          args: [dataUri]
        });
      } catch (e) {
        console.error('Contract write failed:', e);
        throw e;
      }
      setLoading(false);
    } catch (e) {
      setLoading(false);
      setError(e instanceof Error ? e.message : 'Unknown error');
    }
  };

  return (
    <>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="generate-button" style={{ width: 'auto' }} onClick={handleOpenForFilecoin}>
          Mint on Filecoin Calibration
        </button>
      </div>
      {open && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'grid', placeItems: 'center', zIndex: 999999 }}>
          <div style={{ background: 'rgba(15,23,42,0.98)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, padding: 20, width: 420, maxWidth: '90%', zIndex: 1000000, boxShadow: '0 20px 50px rgba(0,0,0,0.6)' }}>
            <h3 style={{ color: 'white', marginBottom: 12 }}>Mint NFT</h3>
            <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 8 }}>
              Network: Filecoin Calibration Testnet
            </div>
            <div style={{ color: '#cbd5e1', fontSize: 12, marginBottom: 8 }}>Image</div>
            <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 8, wordBreak: 'break-all' }}>{imageUrl}</div>
            <div style={{ color: '#cbd5e1', fontSize: 12, marginTop: 8 }}>Name</div>
            <input value={name} onChange={(e) => setName(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.2)', color: 'white' }} />
            <div style={{ color: '#cbd5e1', fontSize: 12, marginTop: 8 }}>Description</div>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.2)', color: 'white' }} />
            {error && <div style={{ color: '#f87171', marginTop: 8 }}>{error}</div>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
              <button className="secondary-button" onClick={() => setOpen(false)}>Cancel</button>
              <button className={`generate-button ${loading ? 'disabled' : ''}`} disabled={loading || !name.trim() || !description.trim()} onClick={onMint}>
                {loading ? 'Uploading…' : 'Upload & Mint'}
              </button>
            </div>
            {metadataUrl && (
              <div style={{ color: '#cbd5e1', marginTop: 8, wordBreak: 'break-all' }}>Metadata: {metadataUrl}</div>
            )}
            {writeError && <div style={{ color: '#f87171', marginTop: 8 }}>Tx error: {String(writeError.message || writeError)}</div>}
            {isPending && <div style={{ color: '#cbd5e1', marginTop: 8 }}>Waiting for wallet confirmation…</div>}
            {isConfirming && <div style={{ color: '#cbd5e1', marginTop: 8 }}>Transaction pending…</div>}
            {isConfirmed && <div style={{ color: '#34d399', marginTop: 8 }}>Mint confirmed!</div>}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}



