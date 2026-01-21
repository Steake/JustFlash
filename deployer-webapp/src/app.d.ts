/// <reference types="@sveltejs/kit" />

declare global {
  namespace App {
    interface Locals {
      user:  {
        address: string;
        role: 'admin' | 'developer' | 'marketing' | 'viewer';
        permissions: string[];
      } | null;
    }
    
    interface PageData {
      deploymentStage: DeploymentStage;
      systemStatus: SystemStatus;
    }
    
    interface Error {
      message: string;
      code?:  string;
    }
  }
}

export type DeploymentStage = 
  | 'pre-deployment'
  | 'testnet'
  | 'beta-mainnet'
  | 'mainnet'
  | 'post-launch';

export type SystemStatus = {
  contracts: ContractStatus[];
  infrastructure: InfraStatus[];
  marketing: MarketingStatus;
  business: BusinessStatus;
};