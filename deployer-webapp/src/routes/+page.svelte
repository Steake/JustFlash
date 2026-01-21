<script lang="ts">
  import { onMount } from 'svelte';
  import { deploymentStore } from '$lib/stores/deployment';
  import { web3Store } from '$lib/stores/web3';
  import DeploymentPipeline from '$lib/components/DeploymentPipeline.svelte';
  import StatusDashboard from '$lib/components/StatusDashboard.svelte';
  import TaskManager from '$lib/components/TaskManager.svelte';
  import MarketingTracker from '$lib/components/MarketingTracker.svelte';
  import BusinessDevelopment from '$lib/components/BusinessDevelopment.svelte';
  
  let activeTab = 'overview';
  
  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id:  'deployment', label: 'Deployment', icon: '🚀' },
    { id: 'tasks', label: 'Tasks', icon: '✅' },
    { id:  'marketing', label: 'Marketing', icon: '📢' },
    { id: 'business', label: 'Business Dev', icon: '🤝' },
    { id: 'monitoring', label: 'Monitoring', icon: '📈' },
    { id: 'documentation', label: 'Docs', icon: '📚' }
  ];
  
  onMount(async () => {
    await web3Store.initialize();
    await deploymentStore.loadConfiguration();
  });
</script>

<div class="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
  <!-- Header -->
  <header class="bg-black/50 backdrop-blur-lg border-b border-gray-700">
    <div class="container mx-auto px-4 py-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <h1 class="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
            JustFlash Deployment Control Center
          </h1>
          <span class="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
            {$deploymentStore.currentStage}
          </span>
        </div>
        <div class="flex items-center space-x-4">
          <button class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition">
            Connect Wallet
          </button>
        </div>
      </div>
    </div>
  </header>

  <!-- Navigation Tabs -->
  <nav class="bg-black/30 backdrop-blur-md border-b border-gray-700">
    <div class="container mx-auto px-4">
      <div class="flex space-x-1 overflow-x-auto">
        {#each tabs as tab}
          <button
            class="px-4 py-3 flex items-center space-x-2 hover:bg-white/5 transition
                   {activeTab === tab. id ? 'border-b-2 border-blue-500 bg-white/10' : ''}"
            on:click={() => activeTab = tab.id}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        {/each}
      </div>
    </div>
  </nav>

  <!-- Content Area -->
  <main class="container mx-auto px-4 py-8">
    {#if activeTab === 'overview'}
      <StatusDashboard />
    {:else if activeTab === 'deployment'}
      <DeploymentPipeline />
    {:else if activeTab === 'tasks'}
      <TaskManager />
    {:else if activeTab === 'marketing'}
      <MarketingTracker />
    {:else if activeTab === 'business'}
      <BusinessDevelopment />
    {/if}
  </main>
</div>