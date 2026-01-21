<script>
  import { onMount } from 'svelte';
  
  let status = 'Loading...';
  
  onMount(() => {
    status = 'JustFlash Deployment Dashboard - Operational';
  });
</script>

<div class="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-8">
  <div class="max-w-7xl mx-auto">
    <h1 class="text-4xl font-bold mb-8 bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
      JustFlash Deployment Control Center
    </h1>
    
    <div class="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
      <h2 class="text-2xl font-semibold mb-4">System Status</h2>
      <p class="text-gray-300">{status}</p>
      
      <div class="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-gray-700/50 rounded-lg p-4">
          <h3 class="text-lg font-medium mb-2">🚀 Deployment</h3>
          <p class="text-green-400">Ready</p>
        </div>
        
        <div class="bg-gray-700/50 rounded-lg p-4">
          <h3 class="text-lg font-medium mb-2">📊 Monitoring</h3>
          <p class="text-yellow-400">Configuring</p>
        </div>
        
        <div class="bg-gray-700/50 rounded-lg p-4">
          <h3 class="text-lg font-medium mb-2">🔐 Security</h3>
          <p class="text-green-400">Active</p>
        </div>
      </div>
    </div>
    
    <div class="mt-8 text-center text-gray-500">
      <p>Native Flash Loan Protocol for TRX</p>
    </div>
  </div>
</div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
  }
</style>
