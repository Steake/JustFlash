<script lang="ts">
	export let totalTVL: number;
	export let flashLoanFee: number;
	export let poolCount: number;

	$: formattedTVL = totalTVL.toLocaleString('en-US', {
		style: 'currency',
		currency: 'USD',
		maximumFractionDigits: 0
	});

	// Mock 24h volume (for demo purposes)
	$: volume24h = (totalTVL * 0.3).toLocaleString('en-US', {
		style: 'currency',
		currency: 'USD',
		maximumFractionDigits: 0
	});

	// Calculate fees generated
	$: feesGenerated = ((totalTVL * 0.3 * flashLoanFee) / 10000).toLocaleString('en-US', {
		style: 'currency',
		currency: 'USD',
		maximumFractionDigits: 0
	});
</script>

<section class="stats-section">
	<h2>Protocol Statistics</h2>
	
	<div class="stats-grid">
		<div class="stat-card">
			<div class="stat-icon">💰</div>
			<div class="stat-content">
				<span class="stat-value">{formattedTVL}</span>
				<span class="stat-label">Total Value Locked</span>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon">📊</div>
			<div class="stat-content">
				<span class="stat-value">{volume24h}</span>
				<span class="stat-label">24h Volume (est.)</span>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon">💎</div>
			<div class="stat-content">
				<span class="stat-value">{feesGenerated}</span>
				<span class="stat-label">24h Fees (est.)</span>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon">🏊</div>
			<div class="stat-content">
				<span class="stat-value">{poolCount}</span>
				<span class="stat-label">Active Pools</span>
			</div>
		</div>
	</div>
</section>

<style>
	.stats-section {
		margin-bottom: 2rem;
	}

	.stats-section h2 {
		font-size: 1.5rem;
		margin-bottom: 1.5rem;
		color: #e94560;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1.5rem;
	}

	.stat-card {
		background: linear-gradient(135deg, rgba(233, 69, 96, 0.1), rgba(255, 107, 107, 0.05));
		border-radius: 12px;
		padding: 1.5rem;
		display: flex;
		align-items: center;
		gap: 1rem;
		border: 1px solid rgba(233, 69, 96, 0.2);
		transition: transform 0.2s;
	}

	.stat-card:hover {
		transform: translateY(-2px);
	}

	.stat-icon {
		font-size: 2rem;
		width: 50px;
		height: 50px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(233, 69, 96, 0.2);
		border-radius: 12px;
	}

	.stat-content {
		display: flex;
		flex-direction: column;
	}

	.stat-value {
		font-size: 1.5rem;
		font-weight: bold;
		color: #fff;
	}

	.stat-label {
		font-size: 0.75rem;
		color: #888;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
</style>
