import { useState } from 'react'
import './App.css'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useDisconnect } from 'wagmi'

function App() {
  const [error, setError] = useState<string | null>(null)
  const { address, chainId, isConnected } = useAccount()
  const { disconnect } = useDisconnect()

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}>
        <ConnectButton />
      </div>
      {isConnected && (
        <div style={{ textAlign: 'center', marginTop: 12, color: '#cce7ff' }}>
          Connected: {address} (chain {chainId})
          <div>
            <button onClick={() => disconnect()} style={{ marginTop: 8, padding: '6px 10px', borderRadius: 8, border: '1px solid #444', background: '#222', color: '#ffd1d1', cursor: 'pointer' }}>
              Disconnect
            </button>
          </div>
        </div>
      )}
      {error && <p style={{ color: '#ff6b6b', textAlign: 'center', marginTop: 12 }}>{error}</p>}
    </>
  )
}

export default App
