import { writable, derived } from 'svelte/store';

interface RealtimeMetrics {
  tvl: number;
  tvlHistory: { timestamp: string; value: number }[];
  activeUsers: number;
  userGrowth: { date: string; count: number }[];
  transactionVolume: number;
  gasPrice: number;
  systemHealth: {
    api: number;
    blockchain: number;
    database: number;
    overall: number;
  };
  alerts: Alert[];
}

interface Alert {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: Date;
}

function createRealtimeStore() {
  const { subscribe, set, update } = writable<RealtimeMetrics>({
    tvl: 0,
    tvlHistory: [],
    activeUsers:  0,
    userGrowth: [],
    transactionVolume: 0,
    gasPrice: 0,
    systemHealth: {
      api: 100,
      blockchain: 100,
      database: 100,
      overall: 100
    },
    alerts: []
  });

  let ws: WebSocket | null = null;

  return {
    subscribe,

    connect() {
      if (ws) return;

      ws = new WebSocket(import.meta.env.VITE_WS_URL || 'wss://deploy.justflash.io/ws');
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        this.handleRealtimeUpdate(data);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setTimeout(() => this.connect(), 5000);
      };

      ws.onclose = () => {
        ws = null;
        setTimeout(() => this.connect(), 5000);
      };
    },

    handleRealtimeUpdate(data: any) {
      update(metrics => {
        switch (data.type) {
          case 'tvl':
            return {
              ...metrics,
              tvl: data.value,
              tvlHistory: [...metrics. tvlHistory, {
                timestamp: new Date().toISOString(),
                value: data.value
              }].slice(-100)
            };
          
          case 'users':
            return {
              ...metrics,
              activeUsers: data.value
            };
          
          case 'transaction':
            return {
              ... metrics,
              transactionVolume: metrics.transactionVolume + data. value
            };
          
          case 'health':
            return {
              ... metrics,
              systemHealth: data.value
            };
          
          case 'alert':
            return {
              ...metrics,
              alerts: [{
                id: Math.random().toString(36).substr(2, 9),
                severity: data.severity,
                message: data.message,
                timestamp: new Date()
              }, ...metrics.alerts]. slice(0, 50)
            };
          
          default:
            return metrics;
        }
      });
    },

    updateMetrics() {
      // Simulate metric updates for demo
      update(metrics => ({
        ...metrics,
        tvl: metrics.tvl + (Math.random() - 0.5) * 100000,
        activeUsers: Math.floor(metrics.activeUsers + (Math.random() - 0.5) * 10),
        transactionVolume: metrics.transactionVolume + Math.random() * 10000,
        gasPrice: 20 + Math.random() * 30
      }));
    },

    disconnect() {
      ws?.close();
      ws = null;
    }
  };
}

export const realtimeStore = createRealtimeStore();

// Derived stores for computed values
export const tvlGrowth = derived(
  realtimeStore,
  $metrics => {
    const history = $metrics. tvlHistory;
    if (history.length < 2) return 0;
    const latest = history[history.length - 1]. value;
    const previous = history[history.length - 2]. value;
    return ((latest - previous) / previous) * 100;
  }
);

export const healthScore = derived(
  realtimeStore,
  $metrics => {
    const health = $metrics.systemHealth;
    return (health.api + health.blockchain + health.database) / 3;
  }
);