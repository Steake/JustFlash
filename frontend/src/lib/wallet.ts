/**
 * TronFlash Protocol - TronLink Wallet Integration
 * Provides wallet connection and contract interaction utilities
 */

import { writable, derived, type Readable } from 'svelte/store';

// Contract addresses (to be configured per network)
export const CONTRACTS = {
	development: {
		FlashLoanPool: '',
		FeeCollector: '',
		PoolRegistry: ''
	},
	nile: {
		FlashLoanPool: '',
		FeeCollector: '',
		PoolRegistry: ''
	},
	mainnet: {
		FlashLoanPool: '',
		FeeCollector: '',
		PoolRegistry: ''
	}
};

// Token addresses
export const TOKENS = {
	mainnet: {
		USDT: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
		USDC: 'TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8',
		USDD: 'TPYmHEhy5n8TCEfYGqW2rPxsghSfzghPDn',
		WTRX: 'TNUC9Qb1rRpS5CbWLmNMxXBjyFoydXjWFR'
	},
	nile: {},
	development: {}
};

// Wallet state
export const walletConnected = writable(false);
export const walletAddress = writable<string | null>(null);
export const walletBalance = writable<number>(0);
export const networkName = writable<string>('Unknown');

// Error state
export const walletError = writable<string | null>(null);

// Check if TronLink is installed
export function isTronLinkInstalled(): boolean {
	return typeof window !== 'undefined' && window.tronLink !== undefined;
}

// Check if TronLink is ready
export function isTronLinkReady(): boolean {
	return typeof window !== 'undefined' && 
		window.tronWeb !== undefined && 
		window.tronWeb.ready;
}

// Connect to TronLink wallet
export async function connectWallet(): Promise<boolean> {
	walletError.set(null);

	if (!isTronLinkInstalled()) {
		walletError.set('TronLink wallet is not installed. Please install TronLink extension.');
		return false;
	}

	try {
		// Request account access
		const res = await window.tronLink!.request({ method: 'tron_requestAccounts' });
		
		if (res && window.tronWeb?.ready) {
			const address = window.tronWeb.defaultAddress.base58;
			walletAddress.set(address);
			walletConnected.set(true);
			
			// Get balance
			await updateBalance();
			
			// Detect network
			await detectNetwork();
			
			return true;
		}
		
		walletError.set('Failed to connect to TronLink');
		return false;
	} catch (error) {
		walletError.set(`Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`);
		return false;
	}
}

// Disconnect wallet
export function disconnectWallet(): void {
	walletConnected.set(false);
	walletAddress.set(null);
	walletBalance.set(0);
}

// Update wallet balance
export async function updateBalance(): Promise<void> {
	if (!window.tronWeb?.ready) return;
	
	try {
		const address = window.tronWeb.defaultAddress.base58;
		const balance = await window.tronWeb.trx.getBalance(address);
		walletBalance.set(window.tronWeb.fromSun(balance));
	} catch (error) {
		console.error('Failed to get balance:', error);
	}
}

// Detect current network
async function detectNetwork(): Promise<void> {
	if (!window.tronWeb) return;
	
	try {
		// Try to detect by full host URL
		const fullHost = (window.tronWeb as unknown as { fullNode?: { host?: string } }).fullNode?.host || '';
		
		if (fullHost.includes('trongrid.io') && !fullHost.includes('nile') && !fullHost.includes('shasta')) {
			networkName.set('Mainnet');
		} else if (fullHost.includes('nile')) {
			networkName.set('Nile Testnet');
		} else if (fullHost.includes('shasta')) {
			networkName.set('Shasta Testnet');
		} else if (fullHost.includes('localhost') || fullHost.includes('127.0.0.1')) {
			networkName.set('Local Development');
		} else {
			networkName.set('Unknown Network');
		}
	} catch {
		networkName.set('Unknown');
	}
}

// Get contract instance
export async function getContract(address: string): Promise<TronContract | null> {
	if (!window.tronWeb?.ready) {
		walletError.set('Wallet not connected');
		return null;
	}
	
	try {
		return await window.tronWeb.contract().at(address);
	} catch (error) {
		walletError.set(`Failed to get contract: ${error instanceof Error ? error.message : 'Unknown error'}`);
		return null;
	}
}

// Format address for display
export function formatAddress(address: string | null): string {
	if (!address) return '';
	return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Format token amount
export function formatAmount(amount: number | string, decimals: number = 6): string {
	const num = typeof amount === 'string' ? parseFloat(amount) : amount;
	const value = num / Math.pow(10, decimals);
	return value.toLocaleString('en-US', { maximumFractionDigits: decimals });
}

// Parse token amount
export function parseAmount(amount: string, decimals: number = 6): string {
	const num = parseFloat(amount);
	return (num * Math.pow(10, decimals)).toString();
}
