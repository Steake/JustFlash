import { writable, derived } from 'svelte/store';
import type { DeploymentConfig, DeploymentTask } from '$lib/types/deployment';

interface DeploymentState {
  currentStage: string;
  currentStageIndex:  number;
  config: DeploymentConfig | null;
  tasks: DeploymentTask[];
  completedTasks: string[];
  failedTasks: string[];
  logs: DeploymentLog[];
}

interface DeploymentLog {
  timestamp: Date;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  details?: any;
}

function createDeploymentStore() {
  const { subscribe, set, update } = writable<DeploymentState>({
    currentStage: 'pre-deployment',
    currentStageIndex: 0,
    config: null,
    tasks: [],
    completedTasks: [],
    failedTasks: [],
    logs:  []
  });
  
  return {
    subscribe,
    
    async loadConfiguration() {
      try {
        // Load from localStorage or API
        const savedConfig = localStorage.getItem('deployment-config');
        if (savedConfig) {
          update(state => ({
            ...state,
            config: JSON.parse(savedConfig)
          }));
        }
      } catch (error) {
        console.error('Failed to load deployment config:', error);
      }
    },
    
    async deployContract(contractName: string, args: any[]) {
      update(state => ({
        ...state,
        logs: [...state.logs, {
          timestamp: new Date(),
          level: 'info',
          message: `Deploying ${contractName}...`,
          details: { contractName, args }
        }]
      }));
      
      try {
        // Contract deployment logic here
        // const contract = await deployContract(contractName, args);
        
        update(state => ({
          ...state,
          logs: [... state.logs, {
            timestamp: new Date(),
            level:  'success',
            message:  `${contractName} deployed successfully`,
            details: { contractName, address: '0x...' }
          }]
        }));
      } catch (error) {
        update(state => ({
          ...state,
          logs: [... state.logs, {
            timestamp: new Date(),
            level:  'error',
            message:  `Failed to deploy ${contractName}`,
            details: { error }
          }]
        }));
        throw error;
      }
    },
    
    completeTask(taskId: string) {
      update(state => ({
        ...state,
        completedTasks: [...state.completedTasks, taskId],
        tasks: state.tasks.map(task =>
          task.id === taskId
            ? { ...task, status: 'completed', completedDate: new Date() }
            : task
        )
      }));
    },
    
    advanceStage() {
      update(state => {
        const stages = ['pre-deployment', 'testnet', 'beta-mainnet', 'mainnet', 'post-launch'];
        const nextIndex = Math.min(state.currentStageIndex + 1, stages.length - 1);
        return {
          ...state,
          currentStageIndex: nextIndex,
          currentStage: stages[nextIndex]
        };
      });
    }
  };
}

export const deploymentStore = createDeploymentStore();