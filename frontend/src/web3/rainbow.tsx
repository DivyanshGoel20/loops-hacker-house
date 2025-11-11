import '@rainbow-me/rainbowkit/styles.css'
import { RainbowKitProvider, darkTheme, getDefaultConfig } from '@rainbow-me/rainbowkit'
import { WagmiProvider } from 'wagmi'
import { mainnet, sepolia, arbitrum } from 'wagmi/chains'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? 'NO_ID'

// Build base config from RainbowKit helpers
export const wagmiConfig = getDefaultConfig({
	appName: 'Loops Hacker House',
	projectId,
	chains: [mainnet, sepolia, arbitrum],
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


