<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import {
		walletConnected,
		walletAddress,
		walletBalance,
		networkName,
		formatAddress,
		disconnectWallet
	} from '$lib/wallet';

	const dispatch = createEventDispatcher();

	function handleConnect() {
		dispatch('connect');
	}

	function handleDisconnect() {
		disconnectWallet();
	}
</script>

<header>
	<div class="header-content">
		<div class="logo">
			<span class="logo-icon">⚡</span>
			<span class="logo-text">TronFlash</span>
		</div>

		<nav>
			<a href="/" class="nav-link">Dashboard</a>
			<a href="/docs" class="nav-link">Docs</a>
			<a href="https://github.com/Steake/JustFlash" target="_blank" class="nav-link">GitHub</a>
		</nav>

		<div class="wallet-section">
			{#if $walletConnected}
				<div class="wallet-info">
					<span class="network">{$networkName}</span>
					<span class="balance">{$walletBalance.toFixed(2)} TRX</span>
					<span class="address">{formatAddress($walletAddress)}</span>
					<button class="disconnect-btn" on:click={handleDisconnect}>
						Disconnect
					</button>
				</div>
			{:else}
				<button class="connect-btn" on:click={handleConnect}>
					Connect TronLink
				</button>
			{/if}
		</div>
	</div>
</header>

<style>
	header {
		background: rgba(0, 0, 0, 0.3);
		backdrop-filter: blur(10px);
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		padding: 1rem 2rem;
		position: sticky;
		top: 0;
		z-index: 100;
	}

	.header-content {
		max-width: 1200px;
		margin: 0 auto;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.logo {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 1.5rem;
		font-weight: bold;
	}

	.logo-icon {
		font-size: 2rem;
	}

	.logo-text {
		background: linear-gradient(90deg, #e94560, #ff6b6b);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
	}

	nav {
		display: flex;
		gap: 2rem;
	}

	.nav-link {
		color: #ccc;
		text-decoration: none;
		font-weight: 500;
		transition: color 0.2s;
	}

	.nav-link:hover {
		color: #e94560;
	}

	.wallet-section {
		display: flex;
		align-items: center;
	}

	.wallet-info {
		display: flex;
		align-items: center;
		gap: 1rem;
		background: rgba(255, 255, 255, 0.05);
		padding: 0.5rem 1rem;
		border-radius: 8px;
	}

	.network {
		background: #e94560;
		color: white;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 600;
	}

	.balance {
		color: #4ade80;
		font-weight: 600;
	}

	.address {
		color: #888;
		font-family: monospace;
	}

	.connect-btn {
		background: linear-gradient(90deg, #e94560, #ff6b6b);
		color: white;
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 8px;
		font-weight: 600;
		cursor: pointer;
		transition: transform 0.2s, box-shadow 0.2s;
	}

	.connect-btn:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(233, 69, 96, 0.4);
	}

	.disconnect-btn {
		background: rgba(255, 255, 255, 0.1);
		color: #ccc;
		border: 1px solid rgba(255, 255, 255, 0.2);
		padding: 0.5rem 1rem;
		border-radius: 6px;
		cursor: pointer;
		transition: background 0.2s;
	}

	.disconnect-btn:hover {
		background: rgba(255, 255, 255, 0.2);
	}

	@media (max-width: 768px) {
		.header-content {
			flex-wrap: wrap;
			gap: 1rem;
		}

		nav {
			order: 3;
			width: 100%;
			justify-content: center;
		}

		.wallet-info {
			flex-wrap: wrap;
			justify-content: center;
		}
	}
</style>
