<script lang="ts">
	import { onMount } from 'svelte';
	import Header from '../components/Header.svelte';
	import PoolCard from '../components/PoolCard.svelte';
	import Stats from '../components/Stats.svelte';
	import {
		walletConnected,
		walletAddress,
		walletError,
		connectWallet,
		networkName
	} from '$lib/wallet';
	import { poolsData, isLoading, loadPoolData } from '$lib/contracts';

	// Mock data for demo when contracts not deployed
	const mockPools = [
		{
			token: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
			tokenSymbol: 'USDT',
			liquidity: '50000000000000',
			totalShares: '50000000000000',
			userShares: '0',
			userDeposit: '0',
			flashLoanFee: 5
		},
		{
			token: 'TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8',
			tokenSymbol: 'USDC',
			liquidity: '25000000000000',
			totalShares: '25000000000000',
			userShares: '0',
			userDeposit: '0',
			flashLoanFee: 5
		},
		{
			token: 'TPYmHEhy5n8TCEfYGqW2rPxsghSfzghPDn',
			tokenSymbol: 'USDD',
			liquidity: '10000000000000',
			totalShares: '10000000000000',
			userShares: '0',
			userDeposit: '0',
			flashLoanFee: 5
		}
	];

	let displayPools = mockPools;
	let useMockData = true;

	// Pool address (to be configured after deployment)
	const POOL_ADDRESS = '';
	const TOKEN_ADDRESSES = [
		'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
		'TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8',
		'TPYmHEhy5n8TCEfYGqW2rPxsghSfzghPDn'
	];

	onMount(async () => {
		// Try to load real data if pool is configured
		if (POOL_ADDRESS && $walletConnected) {
			await loadPoolData(POOL_ADDRESS, TOKEN_ADDRESSES);
			if ($poolsData.length > 0) {
				displayPools = $poolsData;
				useMockData = false;
			}
		}
	});

	async function handleConnect() {
		await connectWallet();
		if ($walletConnected && POOL_ADDRESS) {
			await loadPoolData(POOL_ADDRESS, TOKEN_ADDRESSES);
			if ($poolsData.length > 0) {
				displayPools = $poolsData;
				useMockData = false;
			}
		}
	}

	// Calculate total TVL
	$: totalTVL = displayPools.reduce((acc, pool) => {
		return acc + parseInt(pool.liquidity) / 1e6;
	}, 0);
</script>

<svelte:head>
	<title>TronFlash Protocol - Flash Loan Dashboard</title>
</svelte:head>

<div class="app">
	<Header on:connect={handleConnect} />

	<main class="container">
		{#if $walletError}
			<div class="error-banner">
				<span>⚠️ {$walletError}</span>
				<button on:click={() => walletError.set(null)}>×</button>
			</div>
		{/if}

		{#if useMockData}
			<div class="demo-banner">
				<span>📊 Displaying demo data. Connect wallet and deploy contracts for live data.</span>
			</div>
		{/if}

		<Stats {totalTVL} flashLoanFee={5} poolCount={displayPools.length} />

		<section class="pools-section">
			<h2>Liquidity Pools</h2>
			
			{#if $isLoading}
				<div class="loading">Loading pool data...</div>
			{:else}
				<div class="pools-grid">
					{#each displayPools as pool}
						<PoolCard
							tokenSymbol={pool.tokenSymbol}
							tokenAddress={pool.token}
							liquidity={pool.liquidity}
							totalShares={pool.totalShares}
							userShares={pool.userShares}
							userDeposit={pool.userDeposit}
							flashLoanFee={pool.flashLoanFee}
							poolAddress={POOL_ADDRESS}
						/>
					{/each}
				</div>
			{/if}
		</section>

		<section class="info-section">
			<div class="info-card">
				<h3>How Flash Loans Work</h3>
				<ol>
					<li>Borrow any amount of supported tokens without collateral</li>
					<li>Execute your strategy (arbitrage, liquidation, etc.)</li>
					<li>Repay the borrowed amount + 0.05% fee in the same transaction</li>
					<li>If repayment fails, the entire transaction reverts</li>
				</ol>
			</div>

			<div class="info-card">
				<h3>For Liquidity Providers</h3>
				<ul>
					<li>Deposit tokens to earn yield from flash loan fees</li>
					<li>80% of fees distributed to depositors</li>
					<li>No lock-up period - withdraw anytime</li>
					<li>Shares accrue value automatically</li>
				</ul>
			</div>
		</section>
	</main>

	<footer>
		<p>TronFlash Protocol - First Production-Grade Flash Loan Infrastructure for TRON</p>
		<p class="links">
			<a href="https://github.com/Steake/JustFlash" target="_blank">GitHub</a>
			<span>•</span>
			<a href="/docs">Documentation</a>
			<span>•</span>
			<a href="https://tronscan.org" target="_blank">TronScan</a>
		</p>
	</footer>
</div>

<style>
	:global(*) {
		box-sizing: border-box;
		margin: 0;
		padding: 0;
	}

	:global(body) {
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
		background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
		color: #ffffff;
		min-height: 100vh;
	}

	.app {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	.container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
		flex: 1;
	}

	.error-banner {
		background: rgba(220, 53, 69, 0.2);
		border: 1px solid #dc3545;
		border-radius: 8px;
		padding: 1rem;
		margin-bottom: 1.5rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.error-banner button {
		background: none;
		border: none;
		color: #fff;
		font-size: 1.5rem;
		cursor: pointer;
	}

	.demo-banner {
		background: rgba(255, 193, 7, 0.2);
		border: 1px solid #ffc107;
		border-radius: 8px;
		padding: 1rem;
		margin-bottom: 1.5rem;
		text-align: center;
	}

	.pools-section {
		margin: 2rem 0;
	}

	.pools-section h2 {
		font-size: 1.5rem;
		margin-bottom: 1.5rem;
		color: #e94560;
	}

	.pools-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
		gap: 1.5rem;
	}

	.loading {
		text-align: center;
		padding: 3rem;
		color: #888;
	}

	.info-section {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 1.5rem;
		margin: 3rem 0;
	}

	.info-card {
		background: rgba(255, 255, 255, 0.05);
		border-radius: 12px;
		padding: 1.5rem;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.info-card h3 {
		color: #e94560;
		margin-bottom: 1rem;
		font-size: 1.1rem;
	}

	.info-card ol,
	.info-card ul {
		padding-left: 1.5rem;
	}

	.info-card li {
		margin-bottom: 0.5rem;
		color: #ccc;
	}

	footer {
		text-align: center;
		padding: 2rem;
		background: rgba(0, 0, 0, 0.2);
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	footer p {
		color: #888;
		margin-bottom: 0.5rem;
	}

	.links {
		display: flex;
		justify-content: center;
		gap: 1rem;
	}

	.links a {
		color: #e94560;
		text-decoration: none;
	}

	.links a:hover {
		text-decoration: underline;
	}

	.links span {
		color: #444;
	}

	@media (max-width: 768px) {
		.container {
			padding: 1rem;
		}

		.pools-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
