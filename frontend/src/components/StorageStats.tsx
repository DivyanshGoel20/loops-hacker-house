import { useState, useEffect } from 'react';
import './StorageStats.css';

interface StorageStatsData {
  success: boolean;
  balance: {
    usdfc: string;
    usdfcRaw: string;
  };
  network: string;
  warmStorageAddress: string;
  storage: {
    totalFiles: number;
  };
  paymentSetup: {
    hasBalance: boolean;
    sufficientBalance: boolean;
  };
}

interface StorageStatsProps {
  refreshTrigger?: number; // External trigger to refresh
}

export function StorageStats({ refreshTrigger }: StorageStatsProps = {}) {
  const [stats, setStats] = useState<StorageStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:3001/api/storage-stats');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch storage stats');
      }
      
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load storage stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  // Refresh when external trigger changes
  useEffect(() => {
    if (refreshTrigger) {
      fetchStats();
    }
  }, [refreshTrigger]);

  if (loading) {
    return (
      <div className="storage-stats">
        <div className="storage-stats-card">
          <div className="loading-spinner"></div>
          <p>Loading storage statistics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="storage-stats">
        <div className="storage-stats-card error">
          <p>❌ {error}</p>
          <button onClick={fetchStats} className="retry-button">Retry</button>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="storage-stats">
      <div className="storage-stats-card">
        <div className="stats-header">
          <h2>Storage & Payment Statistics</h2>
          <button onClick={fetchStats} className="refresh-button" title="Refresh">
            🔄
          </button>
        </div>

        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-icon">💰</div>
            <div className="stat-content">
              <div className="stat-label">USDFC Balance</div>
              <div className="stat-value">{parseFloat(stats.balance.usdfc).toFixed(4)} USDFC</div>
              <div className={`stat-status ${stats.paymentSetup.sufficientBalance ? 'success' : 'warning'}`}>
                {stats.paymentSetup.sufficientBalance 
                  ? '✅ Sufficient for storage' 
                  : '⚠️ Low balance - deposit more'}
              </div>
            </div>
          </div>

          <div className="stat-item">
            <div className="stat-icon">🌐</div>
            <div className="stat-content">
              <div className="stat-label">Network</div>
              <div className="stat-value">{stats.network}</div>
              <div className="stat-description">Filecoin Calibration Testnet</div>
            </div>
          </div>

          <div className="stat-item">
            <div className="stat-icon">📦</div>
            <div className="stat-content">
              <div className="stat-label">Files Stored</div>
              <div className="stat-value">{stats.storage.totalFiles}</div>
              <div className="stat-description">Total generated images</div>
            </div>
          </div>

          <div className="stat-item">
            <div className="stat-icon">🔗</div>
            <div className="stat-content">
              <div className="stat-label">Storage Service</div>
              <div className="stat-value-address">
                {stats.warmStorageAddress.slice(0, 6)}...{stats.warmStorageAddress.slice(-4)}
              </div>
              <div className="stat-description">Warm Storage Address</div>
            </div>
          </div>
        </div>

        {!stats.paymentSetup.hasBalance && (
          <div className="stats-warning">
            <p>⚠️ No USDFC balance detected. Set up payment to start storing files.</p>
          </div>
        )}
      </div>
    </div>
  );
}

