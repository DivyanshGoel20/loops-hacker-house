import '@rainbow-me/rainbowkit/styles.css'
import { RainbowKitProvider, darkTheme, getDefaultConfig } from '@rainbow-me/rainbowkit'
import { WagmiProvider } from 'wagmi'
import { mainnet, sepolia, arbitrum } from 'wagmi/chains'
import type { Chain } from 'wagmi/chains'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? 'NO_ID'

// Filecoin Calibration Testnet
export const filecoinCalibration: Chain = {
	id: 314159,
	name: 'Filecoin Calibration',
	nativeCurrency: {
		name: 'tFIL',
		symbol: 'tFIL',
		decimals: 18,
	},
	rpcUrls: {
		default: {
			http: ['https://api.calibration.node.glif.io/rpc/v1'],
			webSocket: ['wss://api.calibration.node.glif.io/rpc/v1'],
		},
	},
	blockExplorers: {
		default: {
			name: 'Filfox',
			url: 'https://calibration.filfox.info',
		},
	},
	testnet: true,
} as const satisfies Chain

// Build base config from RainbowKit helpers
export const wagmiConfig = getDefaultConfig({
	appName: 'Loops Hacker House',
	projectId,
	chains: [mainnet, sepolia, arbitrum, filecoinCalibration],
	ssr: false
})

const queryClient = new QueryClient()

export function Web3Providers({ children }: { children: ReactNode }) {
	return (
		<WagmiProvider config={wagmiConfig}>
			<QueryClientProvider client={queryClient}>
				<RainbowKitProvider theme={darkTheme()}>
					{children}
				</RainbowKitProvider>
			</QueryClientProvider>
		</WagmiProvider>
	)
}


