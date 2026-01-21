<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Line, Bar, Doughnut, Radar } from 'svelte-chartjs';
  import {
    Chart as ChartJS,
    Title,
    Tooltip,
    Legend,
    LineElement,
    LinearScale,
    PointElement,
    CategoryScale,
    BarElement,
    ArcElement,
    RadialLinearScale,
    Filler
  } from 'chart.js';
  import { realtimeStore } from '$lib/stores/realtime';
  import MetricsCard from './MetricsCard.svelte';
  import LiveActivityFeed from './LiveActivityFeed. svelte';
  
  ChartJS.register(
    Title, Tooltip, Legend, LineElement, LinearScale,
    PointElement, CategoryScale, BarElement, ArcElement,
    RadialLinearScale, Filler
  );
  
  let websocket: WebSocket;
  
  // Real-time metrics
  $:  tvlHistory = $realtimeStore.tvlHistory;
  $: userGrowth = $realtimeStore.userGrowth;
  $:  transactionVolume = $realtimeStore.transactionVolume;
  $: systemHealth = $realtimeStore. systemHealth;
  
  // Chart configurations with gradient fills
  const tvlChartData = {
    labels: tvlHistory.map(d => d.timestamp),
    datasets: [{
      label: 'Total Value Locked',
      data: tvlHistory.map(d => d.value),
      borderColor: 'rgb(59, 130, 246)',
      backgroundColor: (context:  any) => {
        const ctx = context.chart.ctx;
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(59, 130, 246, 0.5)');
        gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
        return gradient;
      },
      fill: true,
      tension: 0.4
    }]
  };
  
  const userActivityData = {
    labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
    datasets: [{
      label: 'Active Users',
      data: [120, 190, 300, 500, 420, 380],
      backgroundColor:  (context: any) => {
        const ctx = context.chart.ctx;
        const gradient = ctx. createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(168, 85, 247, 0.8)');
        gradient.addColorStop(1, 'rgba(168, 85, 247, 0.2)');
        return gradient;
      },
      borderColor:  'rgb(168, 85, 247)',
      borderWidth: 2
    }]
  };
  
  const protocolMetricsData = {
    labels:  ['TVL', 'Users', 'Transactions', 'Revenue', 'Partnerships', 'Security'],
    datasets: [{
      label: 'Current',
      data: [85, 72, 90, 68, 88, 95],
      borderColor: 'rgb(34, 197, 94)',
      backgroundColor: 'rgba(34, 197, 94, 0.2)',
      pointBackgroundColor: 'rgb(34, 197, 94)',
      pointBorderColor: '#fff',
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: 'rgb(34, 197, 94)'
    }, {
      label: 'Target',
      data: [100, 100, 100, 100, 100, 100],
      borderColor: 'rgb(239, 68, 68)',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      pointBackgroundColor:  'rgb(239, 68, 68)',
      pointBorderColor: '#fff'
    }]
  };
  
  const marketShareData = {
    labels: ['JustFlash', 'Competitor A', 'Competitor B', 'Competitor C', 'Others'],
    datasets: [{
      data: [35, 25, 20, 15, 5],
      backgroundColor: [
        'rgba(59, 130, 246, 0.8)',
        'rgba(168, 85, 247, 0.8)',
        'rgba(236, 72, 153, 0.8)',
        'rgba(251, 146, 60, 0.8)',
        'rgba(163, 163, 163, 0.8)'
      ],
      borderColor: [
        'rgb(59, 130, 246)',
        'rgb(168, 85, 247)',
        'rgb(236, 72, 153)',
        'rgb(251, 146, 60)',
        'rgb(163, 163, 163)'
      ],
      borderWidth: 2
    }]
  };
  
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        labels: {
          color: '#9ca3af',
          font: {
            family: 'Inter, system-ui, sans-serif'
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.9)',
        titleColor: '#f3f4f6',
        bodyColor: '#d1d5db',
        borderColor: '#374151',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(75, 85, 99, 0.2)',
          drawBorder: false
        },
        ticks: {
          color: '#9ca3af'
        }
      },
      y: {
        grid: {
          color: 'rgba(75, 85, 99, 0.2)',
          drawBorder: false
        },
        ticks: {
          color: '#9ca3af'
        }
      }
    }
  };
  
  onMount(() => {
    // Initialize WebSocket connection for real-time updates
    connectWebSocket();
    
    // Start animation intervals
    const interval = setInterval(() => {
      realtimeStore.updateMetrics();
    }, 3000);
    
    return () => clearInterval(interval);
  });
  
  function connectWebSocket() {
    websocket = new WebSocket(import.meta.env. VITE_WS_URL || 'wss://deploy.justflash.io/ws');
    
    websocket. onmessage = (event) => {
      const data = JSON.parse(event.data);
      realtimeStore.handleRealtimeUpdate(data);
    };
    
    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setTimeout(connectWebSocket, 5000);
    };
  }
  
  onDestroy(() => {
    websocket?.close();
  });
</script>

<div class="space-y-6 p-6">
  <!-- Key Metrics Cards with Animated Values -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    <MetricsCard
      title="Total Value Locked"
      value="$42,847,293"
      change="+12.4%"
      trend="up"
      sparklineData={[30, 35, 32, 38, 40, 42, 45, 48, 52, 49, 54, 58]}
      icon="💰"
    />
    <MetricsCard
      title="Active Users"
      value="8,432"
      change="+24.8%"
      trend="up"
      sparklineData={[20, 22, 25, 24, 28, 30, 32, 35, 38, 40, 42, 45]}
      icon="👥"
    />
    <MetricsCard
      title="24h Volume"
      value="$1,234,567"
      change="-3.2%"
      trend="down"
      sparklineData={[45, 42, 44, 40, 38, 35, 37, 34, 32, 30, 28, 27]}
      icon="📊"
    />
    <MetricsCard
      title="System Health"
      value="98.7%"
      change="+0.2%"
      trend="up"
      sparklineData={[95, 96, 97, 96, 98, 98, 97, 98, 99, 98, 99, 99]}
      icon="🔧"
    />
  </div>

  <!-- Main Charts Grid -->
  <div class="grid grid-cols-1 lg: grid-cols-2 gap-6">
    <!-- TVL Growth Chart -->
    <div class="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold text-white">TVL Growth</h3>
        <select class="bg-gray-700 text-sm rounded px-3 py-1 border border-gray-600">
          <option>Last 7 days</option>
          <option>Last 30 days</option>
          <option>Last 90 days</option>
        </select>
      </div>
      <div class="h-64">
        <Line data={tvlChartData} options={chartOptions} />
      </div>
    </div>

    <!-- User Activity Heatmap -->
    <div class="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
      <h3 class="text-lg font-semibold text-white mb-4">User Activity Pattern</h3>
      <div class="h-64">
        <Bar data={userActivityData} options={chartOptions} />
      </div>
    </div>

    <!-- Protocol Health Radar -->
    <div class="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
      <h3 class="text-lg font-semibold text-white mb-4">Protocol Health Score</h3>
      <div class="h-64">
        <Radar data={protocolMetricsData} options={{
          ... chartOptions,
          scales: {
            r: {
              angleLines: {
                color: 'rgba(75, 85, 99, 0.2)'
              },
              grid:  {
                color: 'rgba(75, 85, 99, 0.2)'
              },
              pointLabels: {
                color: '#9ca3af'
              },
              ticks: {
                color: '#9ca3af',
                backdropColor: 'transparent'
              }
            }
          }
        }} />
      </div>
    </div>

    <!-- Market Share Distribution -->
    <div class="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
      <h3 class="text-lg font-semibold text-white mb-4">Market Share</h3>
      <div class="h-64">
        <Doughnut data={marketShareData} options={{
          ...chartOptions,
          cutout: '60%'
        }} />
      </div>
    </div>
  </div>

  <!-- Live Activity Feed -->
  <LiveActivityFeed />
</div>