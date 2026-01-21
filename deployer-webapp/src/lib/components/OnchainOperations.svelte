<script lang="ts">
  import { ethers } from 'ethers';
  import { onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import ContractDeployment from './ops/ContractDeployment.svelte';
  import GasMonitor from './ops/GasMonitor.svelte';
  import LiquidityManager from './ops/LiquidityManager.svelte';
  import SecurityMonitor from './ops/SecurityMonitor.svelte';
  import EmergencyControls from './ops/EmergencyControls.svelte';
  
  let activeOperation = 'deployment';
  let deploymentProgress = 0;
  let currentStep = '';
  let logs:  any[] = [];
  
  const operations = [
    { id: 'deployment', label: 'Contract Deployment', icon: '🚀', status: 'in-progress' },
    { id: 'multisig', label: 'Multi-Sig Setup', icon: '🔐', status: 'pending' },
    { id: 'oracles', label: 'Oracle Config', icon: '🔮', status: 'pending' },
    { id: 'liquidity', label: 'Liquidity Ops', icon: '💧', status: 'pending' },
    { id: 'security', label: 'Security', icon: '🛡️', status: 'pending' },
    { id: 'gas', label: 'Gas Optimization', icon: '⛽', status: 'pending' },
    { id: 'monitoring', label: 'Monitoring', icon: '📊', status: 'pending' },
    { id: 'emergency', label: 'Emergency', icon: '🚨', status: 'ready' }
  ];
  
  async function executeDeployment() {
    const steps = [
      { name: 'Compile Contracts', weight: 10 },
      { name: 'Run Tests', weight: 15 },
      { name: 'Deploy Token', weight: 20 },
      { name: 'Deploy Core', weight: 20 },
      { name: 'Deploy Governance', weight: 15 },
      { name: 'Verify Contracts', weight: 10 },
      { name: 'Configure Parameters', weight: 10 }
    ];
    
    for (const step of steps) {
      currentStep = step.name;
      addLog('info', `Executing:  ${step.name}`);
      
      // Simulate step execution
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      deploymentProgress += step.weight;
      addLog('success', `Completed: ${step.name}`);
    }
  }
  
  function addLog(type:  string, message: string) {
    logs = [{
      id: Date.now(),
      type,
      message,
      timestamp: new Date().toLocaleTimeString()
    }, ...logs].slice(0, 100);
  }
  
  onMount(() => {
    // Initialize Web3 connection
    if (typeof window.ethereum !== 'undefined') {
      addLog('info', 'Web3 provider detected');
    }
  });
</script>

<div class="space-y-6">
  <!-- Operation Navigation -->
  <div class="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
    <div class="flex items-center space-x-2 overflow-x-auto">
      {#each operations as op}
        <button
          on:click={() => activeOperation = op.id}
          class="flex items-center space-x-2 px-4 py-2 rounded-lg transition-all
                 {activeOperation === op.id 
                   ? 'bg-blue-600 text-white' 
                   : 'bg-gray-700/50 hover:bg-gray-700 text-gray-300'}"
        >
          <span class="text-lg">{op.icon}</span>
          <span class="whitespace-nowrap">{op. label}</span>
          {#if op.status === 'in-progress'}
            <span class="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
          {: else if op.status === 'completed'}
            <span class="w-2 h-2 bg-green-400 rounded-full"></span>
          {/if}
        </button>
      {/each}
    </div>
  </div>
  
  <!-- Main Operation Panel -->
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <!-- Operation Content -->
    <div class="lg:col-span-2 space-y-6">
      {#if activeOperation === 'deployment'}
        <ContractDeployment {deploymentProgress} {currentStep} on:deploy={executeDeployment} />
      {:else if activeOperation === 'liquidity'}
        <LiquidityManager />
      {:else if activeOperation === 'security'}
        <SecurityMonitor />
      {:else if activeOperation === 'gas'}
        <GasMonitor />
      {:else if activeOperation === 'emergency'}
        <EmergencyControls on:alert={(e) => addLog('critical', e.detail)} />
      {/if}
    </div>
    
    <!-- Activity Log -->
    <div class="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold">Operation Log</h3>
        <button 
          on:click={() => logs = []}
          class="text-sm text-gray-400 hover: text-white transition"
        >
          Clear
        </button>
      </div>
      
      <div class="space-y-2 max-h-96 overflow-y-auto">
        {#each logs as log (log.id)}
          <div 
            in:fly={{ x: 20, duration: 300 }}
            class="text-sm p-2 rounded border
                   {log.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 
                    log.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                    log. type === 'critical' ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' :
                    'bg-blue-500/10 border-blue-500/30 text-blue-400'}"
          >
            <div class="flex justify-between">
              <span>{log.message}</span>
              <span class="text-xs opacity-60">{log.timestamp}</span>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>
  
  <!-- Quick Actions -->
  <div class="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
    <h3 class="text-lg font-semibold mb-4">Quick Actions</h3>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <button class="p-4 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition">
        <span class="text-2xl">⏸️</span>
        <p class="mt-2 text-sm">Pause Protocol</p>
      </button>
      <button class="p-4 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition">
        <span class="text-2xl">📸</span>
        <p class="mt-2 text-sm">Snapshot State</p>
      </button>
      <button class="p-4 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition">
        <span class="text-2xl">🔄</span>
        <p class="mt-2 text-sm">Sync Oracles</p>
      </button>
      <button class="p-4 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition">
        <span class="text-2xl">📢</span>
        <p class="mt-2 text-sm">Broadcast Update</p>
      </button>
    </div>
  </div>
</div>