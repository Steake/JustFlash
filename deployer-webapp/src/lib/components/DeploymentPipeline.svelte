<script lang="ts">
  import { deploymentStore } from '$lib/stores/deployment';
  import ContractDeployer from './ContractDeployer.svelte';
  import DeploymentChecklist from './DeploymentChecklist.svelte';
  
  const stages = [
    {
      id: 'pre-deployment',
      title: 'Pre-Deployment',
      tasks: [
        'Complete smart contract audits',
        'Finalize contract parameters',
        'Set up multi-sig wallets',
        'Configure monitoring infrastructure',
        'Prepare documentation'
      ]
    },
    {
      id: 'testnet',
      title: 'Testnet Deployment',
      tasks: [
        'Deploy to Sepolia/Goerli',
        'Verify contracts on Etherscan',
        'Run integration tests',
        'Community beta testing',
        'Bug bounty program'
      ]
    },
    {
      id: 'beta-mainnet',
      title: 'Beta Mainnet',
      tasks: [
        'Deploy core contracts',
        'Set initial parameters',
        'Whitelist beta users',
        'Monitor system metrics',
        'Gather feedback'
      ]
    },
    {
      id: 'mainnet',
      title:  'Full Mainnet Launch',
      tasks: [
        'Enable all features',
        'Remove access restrictions',
        'Launch marketing campaign',
        'Activate liquidity incentives',
        'Community announcements'
      ]
    },
    {
      id: 'post-launch',
      title: 'Post-Launch',
      tasks: [
        'Monitor system health',
        'Track user metrics',
        'Implement improvements',
        'Expand partnerships',
        'Scale infrastructure'
      ]
    }
  ];
</script>

<div class="space-y-8">
  <div class="bg-gray-800/50 rounded-xl p-6 backdrop-blur-sm">
    <h2 class="text-2xl font-bold mb-6">Deployment Pipeline</h2>
    
    <!-- Pipeline Visualization -->
    <div class="relative">
      <div class="absolute top-8 left-0 right-0 h-1 bg-gray-700"></div>
      <div class="relative flex justify-between">
        {#each stages as stage, index}
          <div class="relative flex flex-col items-center">
            <div class="w-16 h-16 rounded-full flex items-center justify-center z-10
                        {$deploymentStore.currentStageIndex >= index 
                          ? 'bg-green-500' 
                          : 'bg-gray-700'}">
              <span class="text-2xl font-bold">{index + 1}</span>
            </div>
            <div class="mt-2 text-center">
              <p class="font-semibold">{stage.title}</p>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>

  <!-- Current Stage Details -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <ContractDeployer />
    <DeploymentChecklist />
  </div>
</div>