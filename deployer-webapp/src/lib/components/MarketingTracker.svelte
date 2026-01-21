<script lang="ts">
  import { marketingStore } from '$lib/stores/marketing';
  
  interface MarketingMilestone {
    id: string;
    phase: string;
    title: string;
    description: string;
    targetDate: Date;
    status:  'planning' | 'active' | 'completed';
    kpis: {
      metric: string;
      target: number;
      current: number;
      unit: string;
    }[];
    channels: string[];
    budget: number;
    spent: number;
  }
  
  const milestones: MarketingMilestone[] = [
    {
      id: 'awareness',
      phase: 'Pre-Launch',
      title: 'Build Awareness Campaign',
      description: 'Generate initial interest and build community',
      targetDate: new Date('2026-02-01'),
      status: 'planning',
      kpis: [
        { metric: 'Twitter Followers', target: 10000, current: 0, unit: 'followers' },
        { metric: 'Discord Members', target: 5000, current:  0, unit: 'members' },
        { metric: 'Newsletter Subscribers', target: 2000, current: 0, unit:  'subscribers' }
      ],
      channels: ['Twitter', 'Discord', 'Medium', 'YouTube'],
      budget: 50000,
      spent: 0
    },
    {
      id: 'beta-launch',
      phase: 'Beta Launch',
      title: 'Beta User Acquisition',
      description: 'Onboard early adopters and power users',
      targetDate: new Date('2026-03-01'),
      status: 'planning',
      kpis: [
        { metric: 'Beta Users', target: 1000, current: 0, unit: 'users' },
        { metric:  'TVL', target: 1000000, current: 0, unit: 'USD' },
        { metric: 'Daily Transactions', target: 500, current: 0, unit:  'txns' }
      ],
      channels: ['Influencer Partnerships', 'Airdrops', 'Referral Program'],
      budget: 100000,
      spent: 0
    },
    {
      id: 'mainnet-launch',
      phase: 'Mainnet Launch',
      title:  'Full Launch Campaign',
      description: 'Major marketing push for mainnet launch',
      targetDate: new Date('2026-04-01'),
      status: 'planning',
      kpis: [
        { metric: 'Active Users', target: 10000, current: 0, unit: 'users' },
        { metric: 'TVL', target: 10000000, current: 0, unit: 'USD' },
        { metric: 'Media Mentions', target: 50, current: 0, unit:  'articles' }
      ],
      channels: ['PR Campaign', 'Paid Ads', 'Events', 'Partnerships'],
      budget: 250000,
      spent: 0
    }
  ];
</script>

<div class="space-y-6">
  <div class="bg-gray-800/50 rounded-xl p-6">
    <h2 class="text-2xl font-bold mb-6">Marketing Campaign Tracker</h2>
    
    <div class="space-y-4">
      {#each milestones as milestone}
        <div class="bg-gray-900/50 rounded-lg p-6 border border-gray-700">
          <div class="flex justify-between items-start mb-4">
            <div>
              <span class="text-sm text-gray-400">{milestone.phase}</span>
              <h3 class="text-xl font-semibold">{milestone.title}</h3>
              <p class="text-gray-400 mt-1">{milestone.description}</p>
            </div>
            <span class="px-3 py-1 rounded-full text-sm
                         {milestone.status === 'completed' ? 'bg-green-500/20 text-green-400' : 
                          milestone.status === 'active' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-gray-500/20 text-gray-400'}">
              {milestone.status}
            </span>
          </div>
          
          <!-- KPIs -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {#each milestone.kpis as kpi}
              <div class="bg-gray-800/50 rounded p-3">
                <p class="text-sm text-gray-400">{kpi.metric}</p>
                <p class="text-xl font-bold">
                  {kpi.current. toLocaleString()} / {kpi.target. toLocaleString()}
                  <span class="text-sm text-gray-400 ml-1">{kpi.unit}</span>
                </p>
                <div class="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div class="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                       style="width: {(kpi.current / kpi.target) * 100}%"></div>
                </div>
              </div>
            {/each}
          </div>
          
          <!-- Channels & Budget -->
          <div class="flex justify-between items-center">
            <div class="flex gap-2">
              {#each milestone.channels as channel}
                <span class="px-2 py-1 bg-blue-500/10 text-blue-400 rounded text-xs">
                  {channel}
                </span>
              {/each}
            </div>
            <div class="text-right">
              <p class="text-sm text-gray-400">Budget</p>
              <p class="font-semibold">
                ${milestone. spent.toLocaleString()} / ${milestone.budget.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      {/each}
    </div>
  </div>
</div>