# Filecoin Onchain Cloud Setup Guide

## Environment Variables

Add these to your `.env` file in the `backend` directory:

```env
# Filecoin Onchain Cloud Configuration
FILECOIN_PRIVATE_KEY=your_filecoin_wallet_private_key_here
FILECOIN_RPC_URL=wss://calibration.filoz.xyz  # Optional, defaults to calibration testnet
```

## What is FILECOIN_PRIVATE_KEY?

**Yes, it's a wallet private key** - specifically a **Filecoin wallet private key** that will be used to:
- Pay for storage on Filecoin Onchain Cloud
- Deposit USDFC tokens
- Approve the Warm Storage service

### Important Security Notes:
- ⚠️ **NEVER commit this private key to git**
- ⚠️ **Keep it secure** - this key controls funds
- ⚠️ **Use a dedicated wallet** - don't use your main wallet's private key
- ⚠️ **Store it in `.env` file** - which should be in `.gitignore`

### How to Get a Filecoin Private Key:

1. **Create a new Filecoin wallet** (recommended for testing):
   - Use a wallet like MetaMask or create a new wallet
   - Export the private key
   - Make sure it has some USDFC tokens for payments

2. **For Calibration Testnet** (testing):
   - Get testnet USDFC from a faucet
   - Use a test wallet private key

3. **For Mainnet** (production):
   - Use a secure, dedicated wallet
   - Fund it with USDFC tokens
   - Keep the private key extremely secure

## Setup Steps

1. **Add environment variables** to `backend/.env`:
   ```env
   FILECOIN_PRIVATE_KEY=0x...
   FILECOIN_RPC_URL=wss://calibration.filoz.xyz  # Optional
   ```

2. **Install dependencies**:
   ```bash
   cd backend
   npm install
   ```

3. **Start the backend server** (REQUIRED):
   ```bash
   npm start
   ```
   ⚠️ **IMPORTANT**: The backend server MUST be running for payment setup to work!

4. **Run payment setup** (one-time):
   - Make sure backend server is running on `http://localhost:3001`
   - Go to the homepage
   - Click "⚙️ Setup Filecoin Payment" button
   - Or call: `POST http://localhost:3001/api/setup-payment`
   - This will:
     - Deposit USDFC to Filecoin Pay contract (on-chain transaction)
     - Approve Warm Storage service address (on-chain transaction)
   - **Note**: The "localhost" is just the API endpoint. Actual payments go to the Filecoin blockchain!

## What the Payment Setup Does

1. **Checks wallet balance** - Verifies you have USDFC tokens
2. **Deposits 5 USDFC** - If balance is insufficient, deposits 5 USDFC tokens
3. **Approves service** - Approves the Warm Storage service to use your tokens for storage payments

## Network Options

- **Calibration (Testnet)**: `wss://calibration.filoz.xyz` - For testing
- **Mainnet**: Use the mainnet RPC URL (check Synapse SDK docs)

## Troubleshooting

- **"FILECOIN_PRIVATE_KEY not set"**: Add it to your `.env` file
- **"Insufficient balance"**: Make sure your wallet has USDFC tokens
- **"Connection failed"**: Check your RPC URL and network connection

