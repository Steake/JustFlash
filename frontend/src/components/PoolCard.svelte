<script lang="ts">
	import { formatAmount, walletConnected } from '$lib/wallet';
	import { deposit, withdraw, isLoading } from '$lib/contracts';

	export let tokenSymbol: string;
	export let tokenAddress: string;
	export let liquidity: string;
	export let totalShares: string;
	export let userShares: string;
	export let userDeposit: string;
	export let flashLoanFee: number;
	export let poolAddress: string;

	let depositAmount = '';
	let withdrawAmount = '';
	let showDepositModal = false;
	let showWithdrawModal = false;

	$: formattedLiquidity = formatAmount(liquidity, 6);
	$: formattedUserDeposit = formatAmount(userDeposit, 6);
	$: hasDeposit = BigInt(userShares) > 0;

	// Calculate estimated APY (mock calculation for demo)
	$: estimatedAPY = calculateEstimatedAPY();

	function calculateEstimatedAPY() {
		// Assume 50% utilization with daily volume
		const dailyUtilization = 0.5;
		const dailyFees = (parseInt(liquidity) * dailyUtilization * flashLoanFee) / 10000;
		const depositorShare = dailyFees * 0.8;
		const tvl = parseInt(liquidity) || 1;
		const dailyYield = depositorShare / tvl;
		return ((Math.pow(1 + dailyYield, 365) - 1) * 100).toFixed(2);
	}

	async function handleDeposit() {
		if (!depositAmount || !poolAddress) return;
		
		const txId = await deposit(poolAddress, tokenAddress, depositAmount);
		if (txId) {
			depositAmount = '';
			showDepositModal = false;
			// Refresh data would happen here
		}
	}

	async function handleWithdraw() {
		if (!userShares || !poolAddress) return;
		
		// Withdraw all shares for simplicity
		const txId = await withdraw(poolAddress, tokenAddress, userShares);
		if (txId) {
			withdrawAmount = '';
			showWithdrawModal = false;
		}
	}
</script>

<div class="pool-card">
	<div class="pool-header">
		<div class="token-info">
			<span class="token-symbol">{tokenSymbol}</span>
			<span class="token-address">{tokenAddress.slice(0, 8)}...{tokenAddress.slice(-6)}</span>
		</div>
		<div class="fee-badge">
			{(flashLoanFee / 100).toFixed(2)}% fee
		</div>
	</div>

	<div class="pool-stats">
		<div class="stat">
			<span class="stat-label">Total Liquidity</span>
			<span class="stat-value">${formattedLiquidity}</span>
		</div>
		<div class="stat">
			<span class="stat-label">Est. APY</span>
			<span class="stat-value apy">{estimatedAPY}%</span>
		</div>
	</div>

	{#if $walletConnected && hasDeposit}
		<div class="user-position">
			<h4>Your Position</h4>
			<div class="position-stats">
				<div class="stat">
					<span class="stat-label">Deposited</span>
					<span class="stat-value">${formattedUserDeposit}</span>
				</div>
				<div class="stat">
					<span class="stat-label">Pool Share</span>
					<span class="stat-value">
						{((BigInt(userShares) * 10000n / (BigInt(totalShares) || 1n)) / 100n).toString()}%
					</span>
				</div>
			</div>
		</div>
	{/if}

	<div class="pool-actions">
		<button
			class="action-btn deposit"
			on:click={() => (showDepositModal = true)}
			disabled={!$walletConnected || $isLoading}
		>
			Deposit
		</button>
		<button
			class="action-btn withdraw"
			on:click={() => (showWithdrawModal = true)}
			disabled={!$walletConnected || !hasDeposit || $isLoading}
		>
			Withdraw
		</button>
	</div>
</div>

<!-- Deposit Modal -->
{#if showDepositModal}
	<div class="modal-overlay" on:click={() => (showDepositModal = false)} role="presentation">
		<div class="modal" on:click|stopPropagation role="dialog">
			<h3>Deposit {tokenSymbol}</h3>
			<div class="input-group">
				<input
					type="number"
					bind:value={depositAmount}
					placeholder="Amount"
					step="0.000001"
				/>
				<span class="input-suffix">{tokenSymbol}</span>
			</div>
			<p class="modal-info">
				You will receive pool shares proportional to your deposit.
				Shares accrue value as flash loan fees accumulate.
			</p>
			<div class="modal-actions">
				<button class="cancel-btn" on:click={() => (showDepositModal = false)}>Cancel</button>
				<button
					class="confirm-btn"
					on:click={handleDeposit}
					disabled={!depositAmount || $isLoading}
				>
					{$isLoading ? 'Processing...' : 'Confirm Deposit'}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Withdraw Modal -->
{#if showWithdrawModal}
	<div class="modal-overlay" on:click={() => (showWithdrawModal = false)} role="presentation">
		<div class="modal" on:click|stopPropagation role="dialog">
			<h3>Withdraw {tokenSymbol}</h3>
			<p class="modal-info">
				You will withdraw your full position: <strong>${formattedUserDeposit} {tokenSymbol}</strong>
			</p>
			<div class="modal-actions">
				<button class="cancel-btn" on:click={() => (showWithdrawModal = false)}>Cancel</button>
				<button
					class="confirm-btn"
					on:click={handleWithdraw}
					disabled={$isLoading}
				>
					{$isLoading ? 'Processing...' : 'Confirm Withdrawal'}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.pool-card {
		background: rgba(255, 255, 255, 0.05);
		border-radius: 16px;
		padding: 1.5rem;
		border: 1px solid rgba(255, 255, 255, 0.1);
		transition: transform 0.2s, box-shadow 0.2s;
	}

	.pool-card:hover {
		transform: translateY(-4px);
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
	}

	.pool-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 1.5rem;
	}

	.token-info {
		display: flex;
		flex-direction: column;
	}

	.token-symbol {
		font-size: 1.5rem;
		font-weight: bold;
		color: #fff;
	}

	.token-address {
		font-size: 0.75rem;
		color: #666;
		font-family: monospace;
	}

	.fee-badge {
		background: rgba(233, 69, 96, 0.2);
		color: #e94560;
		padding: 0.25rem 0.75rem;
		border-radius: 20px;
		font-size: 0.875rem;
		font-weight: 600;
	}

	.pool-stats {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.stat {
		display: flex;
		flex-direction: column;
	}

	.stat-label {
		font-size: 0.75rem;
		color: #888;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 0.25rem;
	}

	.stat-value {
		font-size: 1.25rem;
		font-weight: 600;
		color: #fff;
	}

	.stat-value.apy {
		color: #4ade80;
	}

	.user-position {
		background: rgba(233, 69, 96, 0.1);
		border-radius: 12px;
		padding: 1rem;
		margin-bottom: 1.5rem;
	}

	.user-position h4 {
		font-size: 0.875rem;
		color: #e94560;
		margin-bottom: 0.75rem;
	}

	.position-stats {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	.pool-actions {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	.action-btn {
		padding: 0.75rem 1rem;
		border-radius: 8px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		border: none;
	}

	.action-btn.deposit {
		background: linear-gradient(90deg, #e94560, #ff6b6b);
		color: white;
	}

	.action-btn.deposit:hover:not(:disabled) {
		box-shadow: 0 4px 12px rgba(233, 69, 96, 0.4);
	}

	.action-btn.withdraw {
		background: rgba(255, 255, 255, 0.1);
		color: #ccc;
		border: 1px solid rgba(255, 255, 255, 0.2);
	}

	.action-btn.withdraw:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.2);
	}

	.action-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Modal styles */
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.8);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.modal {
		background: #1a1a2e;
		border-radius: 16px;
		padding: 2rem;
		max-width: 400px;
		width: 90%;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.modal h3 {
		margin-bottom: 1.5rem;
		color: #fff;
	}

	.input-group {
		display: flex;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 8px;
		overflow: hidden;
		margin-bottom: 1rem;
	}

	.input-group input {
		flex: 1;
		background: none;
		border: none;
		padding: 1rem;
		color: #fff;
		font-size: 1.125rem;
	}

	.input-group input:focus {
		outline: none;
	}

	.input-suffix {
		padding: 1rem;
		color: #888;
		font-weight: 600;
	}

	.modal-info {
		color: #888;
		font-size: 0.875rem;
		margin-bottom: 1.5rem;
	}

	.modal-actions {
		display: flex;
		gap: 1rem;
	}

	.cancel-btn {
		flex: 1;
		padding: 0.75rem;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		color: #ccc;
		border-radius: 8px;
		cursor: pointer;
	}

	.confirm-btn {
		flex: 1;
		padding: 0.75rem;
		background: linear-gradient(90deg, #e94560, #ff6b6b);
		border: none;
		color: white;
		border-radius: 8px;
		font-weight: 600;
		cursor: pointer;
	}

	.confirm-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
