import { useAccount } from 'wagmi';
import { useState, useEffect } from 'react';

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

interface NFTGalleryProps {
  onSelectionChange?: (selectedNFTs: NFT[]) => void;
  selectionMode?: boolean;
}

const CHAIN_MAP: { [key: number]: string } = {
  1: 'ethereum',
  137: 'matic',
  8453: 'base',
  42161: 'arbitrum',
  5031: 'somnia'
};

export function NFTGallery({ onSelectionChange, selectionMode = false }: NFTGalleryProps) {
  const { address, isConnected, chain } = useAccount();
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [selectedNFTs, setSelectedNFTs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isConnected && address && chain) {
      fetchNFTs();
    } else {
      setNfts([]);
      setError(null);
      setSelectedNFTs(new Set());
    }
  }, [isConnected, address, chain]);

  useEffect(() => {
    if (onSelectionChange) {
      const selectedNFTsData = nfts.filter(nft => 
        selectedNFTs.has(`${nft.contract}-${nft.identifier}`)
      );
      onSelectionChange(selectedNFTsData);
    }
  }, [selectedNFTs, nfts, onSelectionChange]);

  const toggleSelection = (nft: NFT) => {
    const nftId = `${nft.contract}-${nft.identifier}`;
    const newSelection = new Set(selectedNFTs);
    
    if (newSelection.has(nftId)) {
      newSelection.delete(nftId);
    } else {
      newSelection.add(nftId);
    }
    
    setSelectedNFTs(newSelection);
  };

  const fetchNFTs = async () => {
    if (!address || !chain) return;

    setLoading(true);
    setError(null);

    try {
      const chainName = CHAIN_MAP[chain.id];
      if (!chainName) {
        throw new Error(`Unsupported chain: ${chain.name}`);
      }

      const response = await fetch(
        `https://api.opensea.io/api/v2/chain/${chainName}/account/${address}/nfts?limit=50`,
        {
          headers: {
            'accept': 'application/json',
            'x-api-key': import.meta.env.VITE_OPENSEA_API_KEY || 'c85bb07c7fc14ab6b5ed6c01177ec969',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch NFTs: ${response.status}`);
      }

      const data = await response.json();
      setNfts(data.nfts || []);
    } catch (err) {
      console.error('Error fetching NFTs:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch NFTs');
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="nft-gallery">
        <div className="empty-state">
          <h3>Connect Your Wallet</h3>
          <p>Please connect your wallet to view your NFTs</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="nft-gallery">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading your NFTs from {chain?.name}...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="nft-gallery">
        <div className="error">
          <h3>Error Loading NFTs</h3>
          <p>{error}</p>
          <button onClick={fetchNFTs} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (nfts.length === 0) {
    return (
      <div className="nft-gallery">
        <div className="empty-state">
          <h3>No NFTs Found</h3>
          <p>You don't have any NFTs on {chain?.name}</p>
          <button onClick={fetchNFTs} className="retry-button">
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="nft-gallery">
      <div className="gallery-header">
        <h2>Your NFTs ({nfts.length})</h2>
        <p>Showing NFTs from {chain?.name}</p>
        {selectionMode && (
          <div className="selection-info">
            <span className="selected-count">
              {selectedNFTs.size} selected
            </span>
          </div>
        )}
        <button onClick={fetchNFTs} className="refresh-button">
          Refresh
        </button>
      </div>
      <div className="nft-grid">
        {nfts.map((nft) => {
          const nftId = `${nft.contract}-${nft.identifier}`;
          const isSelected = selectedNFTs.has(nftId);
          
          return (
            <div 
              key={nftId} 
              className={`nft-card ${isSelected ? 'selected' : ''} ${selectionMode ? 'selectable' : ''}`}
              onClick={selectionMode ? () => toggleSelection(nft) : undefined}
            >
              {selectionMode && (
                <div className="nft-checkbox">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelection(nft)}
                    onClick={(e) => e.stopPropagation()}
                    className="checkbox-input"
                  />
                </div>
              )}
              <img
                src={nft.image_url || '/placeholder-nft.png'}
                alt={nft.name || 'NFT'}
                className="nft-image"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjNjY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iI2ZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==';
                }}
              />
              <div className="nft-info">
                <div className="nft-name">
                  {nft.name || `#${nft.identifier}`}
                </div>
                <div className="nft-collection">
                  {nft.collection || 'Unknown Collection'}
                </div>
                <div className="nft-metadata">
                  <div className="metadata-item">
                    <span className="metadata-label">Chain:</span>
                    <span className="metadata-value">{chain?.name}</span>
                  </div>
                  <div className="metadata-item">
                    <span className="metadata-label">Standard:</span>
                    <span className="metadata-value">{nft.token_standard}</span>
                  </div>
                  <div className="metadata-item">
                    <span className="metadata-label">Contract:</span>
                    <span className="metadata-value contract-address">
                      {nft.contract.slice(0, 6)}...{nft.contract.slice(-4)}
                    </span>
                  </div>
                </div>
                {nft.description && (
                  <div className="nft-description">
                    {nft.description}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
