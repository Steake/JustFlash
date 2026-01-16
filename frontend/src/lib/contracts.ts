/**
 * TronFlash Protocol - Contract Interaction Module
 * Provides functions for interacting with protocol contracts
 */

import { writable, get } from 'svelte/store';
import { walletConnected, walletAddress, walletError, getContract, parseAmount } from './wallet';

// Pool data store
export interface PoolData {
	token: string;
	tokenSymbol: string;
	liquidity: string;
	totalShares: string;
	userShares: string;
	userDeposit: string;
	flashLoanFee: number;
}

export const poolsData = writable<PoolData[]>([]);
export const isLoading = writable(false);

// Note: ABIs are loaded dynamically from contract instances via getContract()
// TronWeb handles ABI resolution when connecting to deployed contracts

// Load pool data
export async function loadPoolData(poolAddress: string, tokenAddresses: string[]): Promise<void> {
	if (!get(walletConnected)) {
		walletError.set('Wallet not connected');
		return;
	}

	isLoading.set(true);
	walletError.set(null);

	try {
		const pool = await getContract(poolAddress);
		if (!pool) return;

		const userAddr = get(walletAddress);
		const fee = await pool.getFlashLoanFee().call();

		const pools: PoolData[] = [];

		for (const tokenAddr of tokenAddresses) {
			try {
				const token = await getContract(tokenAddr);
				if (!token) continue;

				const [symbol, liquidity, totalShares, userShares] = await Promise.all([
					token.symbol().call(),
					pool.getAvailableLiquidity(tokenAddr).call(),
					pool.getTotalPoolShares(tokenAddr).call(),
					userAddr ? pool.getPoolShares(userAddr, tokenAddr).call() : Promise.resolve('0')
				]);

				let userDeposit = '0';
				if (userShares && BigInt(userShares.toString()) > 0) {
					userDeposit = await pool.sharesToAmount(tokenAddr, userShares).call();
				}

				pools.push({
					token: tokenAddr,
					tokenSymbol: symbol.toString(),
					liquidity: liquidity.toString(),
					totalShares: totalShares.toString(),
					userShares: userShares.toString(),
					userDeposit: userDeposit.toString(),
					flashLoanFee: Number(fee)
				});
			} catch (error) {
				console.error(`Failed to load data for token ${tokenAddr}:`, error);
			}
		}

		poolsData.set(pools);
	} catch (error) {
		walletError.set(`Failed to load pool data: ${error instanceof Error ? error.message : 'Unknown error'}`);
	} finally {
		isLoading.set(false);
	}
}

// Deposit tokens
export async function deposit(
	poolAddress: string,
	tokenAddress: string,
	amount: string,
	decimals: number = 6
): Promise<string | null> {
	if (!get(walletConnected)) {
		walletError.set('Wallet not connected');
		return null;
	}

	isLoading.set(true);
	walletError.set(null);

	try {
		const pool = await getContract(poolAddress);
		const token = await getContract(tokenAddress);
		
		if (!pool || !token) return null;

		const parsedAmount = parseAmount(amount, decimals);

		// Approve token transfer
		await token.approve(poolAddress, parsedAmount).send({ feeLimit: 100_000_000 });

		// Deposit
		const txId = await pool.deposit(tokenAddress, parsedAmount).send({ feeLimit: 200_000_000 });

		return txId;
	} catch (error) {
		walletError.set(`Deposit failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
		return null;
	} finally {
		isLoading.set(false);
	}
}

// Withdraw tokens
export async function withdraw(
	poolAddress: string,
	tokenAddress: string,
	shares: string
): Promise<string | null> {
	if (!get(walletConnected)) {
		walletError.set('Wallet not connected');
		return null;
	}

	isLoading.set(true);
	walletError.set(null);

	try {
		const pool = await getContract(poolAddress);
		if (!pool) return null;

		const txId = await pool.withdraw(tokenAddress, shares).send({ feeLimit: 200_000_000 });

		return txId;
	} catch (error) {
		walletError.set(`Withdrawal failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
		return null;
	} finally {
		isLoading.set(false);
	}
}

// Calculate premium for flash loan
export function calculatePremium(amount: number, feeBps: number): number {
	return (amount * feeBps) / 10000;
}

// Calculate APY for depositors
export function calculateAPY(dailyVolume: number, tvl: number, feeBps: number): number {
	if (tvl === 0) return 0;
	
	// Daily fee revenue
	const dailyFees = (dailyVolume * feeBps) / 10000;
	
	// 80% goes to depositors
	const depositorShare = dailyFees * 0.8;
	
	// Daily yield
	const dailyYield = depositorShare / tvl;
	
	// APY (compounded daily)
	return (Math.pow(1 + dailyYield, 365) - 1) * 100;
}
