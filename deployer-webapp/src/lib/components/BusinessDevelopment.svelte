<script lang="ts">
  interface Partnership {
    id: string;
    name: string;
    type: 'integration' | 'liquidity' | 'marketing' | 'infrastructure';
    status: 'prospecting' | 'negotiating' | 'agreed' | 'live';
    priority: 'high' | 'medium' | 'low';
    contactPerson: string;
    lastContact: Date;
    nextAction: string;
    value: string;
    notes: string;
  }
  
  const partnerships: Partnership[] = [
    {
      id: '1',
      name: 'Uniswap',
      type: 'liquidity',
      status: 'negotiating',
      priority: 'high',
      contactPerson:  'Hayden Adams',
      lastContact:  new Date('2026-01-15'),
      nextAction: 'Finalize liquidity incentive structure',
      value: '$500k liquidity provision',
      notes: 'Discussing concentrated liquidity pools for FLASH token'
    },
    {
      id: '2',
      name: 'Chainlink',
      type: 'infrastructure',
      status: 'agreed',
      priority: 'high',
      contactPerson: 'Sergey Nazarov',
      lastContact: new Date('2026-01-18'),
      nextAction: 'Implement price feeds',
      value: 'Oracle infrastructure',
      notes: 'VRF and price feed integration ready'
    },
    {
      id: '3',
      name: 'Aave',
      type: 'integration',
      status: 'prospecting',
      priority: 'medium',
      contactPerson: 'Stani Kulechov',
      lastContact: new Date('2026-01-10'),
      nextAction: 'Schedule technical discussion',
      value: 'Flash loan integration',
      notes: 'Exploring flash loan liquidity sharing'
    }
  ];
  
  const investorPipeline = [
    { name: 'Paradigm', stage: 'Due Diligence', amount: '$5M', probability: 70 },
    { name: 'a16z Crypto', stage: 'Initial Contact', amount: '$3M', probability: 30 },
    { name: 'Framework Ventures', stage: 'Term Sheet', amount: '$2M', probability: 85 },
    { name: 'Delphi Digital', stage: 'Negotiation', amount: '$1M', probability: 60 }
  ];
</script>

<div class="space-y-6">
  <!-- Partnership Pipeline -->
  <div class="bg-gray-800/50 rounded-xl p-6">
    <h2 class="text-2xl font-bold mb-6">Partnership Pipeline</h2>
    
    <div class="overflow-x-auto">
      <table class="w-full">
        <thead class="border-b border-gray-700">
          <tr class="text-left">
            <th class="pb-3">Partner</th>
            <th class="pb-3">Type</th>
            <th class="pb-3">Status</th>
            <th class="pb-3">Priority</th>
            <th class="pb-3">Next Action</th>
            <th class="pb-3">Value</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-700">
          {#each partnerships as partner}
            <tr class="hover:bg-gray-700/30">
              <td class="py-4">
                <div>
                  <p class="font-semibold">{partner.name}</p>
                  <p class="text-sm text-gray-400">{partner.contactPerson}</p>
                </div>
              </td>
              <td class="py-4">
                <span class="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-sm">
                  {partner.type}
                </span>
              </td>
              <td class="py-4">
                <span class="px-2 py-1 rounded text-sm
                             {partner.status === 'live' ?  'bg-green-500/20 text-green-400' :
                              partner.status === 'agreed' ? 'bg-blue-500/20 text-blue-400' :
                              partner.status === 'negotiating' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-gray-500/20 text-gray-400'}">
                  {partner.status}
                </span>
              </td>
              <td class="py-4">
                <span class="px-2 py-1 rounded text-sm
                             {partner.priority === 'high' ?  'bg-red-500/20 text-red-400' :
                              partner.priority === 'medium' ? 'bg-orange-500/20 text-orange-400' :
                              'bg-gray-500/20 text-gray-400'}">
                  {partner.priority}
                </span>
              </td>
              <td class="py-4 text-sm">{partner.nextAction}</td>
              <td class="py-4 text-sm font-semibold">{partner. value}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
  
  <!-- Investor Pipeline -->
  <div class="bg-gray-800/50 rounded-xl p-6">
    <h2 class="text-2xl font-bold mb-6">Investor Pipeline</h2>
    
    <div class="space-y-4">
      {#each investorPipeline as investor}
        <div class="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
          <div class="flex justify-between items-center">
            <div>
              <p class="font-semibold">{investor.name}</p>
              <p class="text-sm text-gray-400">{investor.stage}</p>
            </div>
            <div class="text-right">
              <p class="font-bold text-lg">{investor.amount}</p>
              <p class="text-sm text-gray-400">{investor.probability}% probability</p>
            </div>
          </div>
          <div class="mt-3 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div class="h-full bg-gradient-to-r from-green-500 to-blue-500"
                 style="width: {investor.probability}%"></div>
          </div>
        </div>
      {/each}
    </div>
    
    <div class="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
      <p class="text-sm text-blue-400">Total Pipeline Value</p>
      <p class="text-2xl font-bold">$11M</p>
      <p class="text-sm text-gray-400 mt-1">Weighted Value:  $6.5M</p>
    </div>
  </div>
</div>