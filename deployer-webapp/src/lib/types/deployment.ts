export interface DeploymentConfig {
  network: {
    chainId: number;
    name:  string;
    rpcUrl:  string;
    blockExplorer: string;
    nativeCurrency: {
      name: string;
      symbol: string;
      decimals: number;
    };
  };
  
  contracts: {
    [key: string]: {
      address?:  string;
      abi: any[];
      deploymentBlock?: number;
      verified?: boolean;
      audit?: {
        auditor: string;
        reportUrl: string;
        completedAt:  string;
        issues: AuditIssue[];
      };
    };
  };
  
  infrastructure: {
    ipfs: {
      gateway: string;
      pinningService: string;
    };
    monitoring: {
      sentryDsn: string;
      datadogApiKey: string;
    };
    apis: {
      backend: string;
      websocket: string;
    };
  };
  
  multisig: {
    address: string;
    owners: string[];
    threshold: number;
  };
}

export interface DeploymentTask {
  id: string;
  category: 'contract' | 'infrastructure' | 'marketing' | 'business' | 'documentation';
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  priority: 'critical' | 'high' | 'medium' | 'low';
  assignee?: string;
  dependencies:  string[];
  startDate?:  Date;
  completedDate?: Date;
  checklist: ChecklistItem[];
  artifacts?:  DeploymentArtifact[];
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  completedBy?: string;
  completedAt?: Date;
  verificationRequired:  boolean;
  verified?: boolean;
}

export interface DeploymentArtifact {
  type: 'contract' | 'document' | 'report' | 'media';
  name: string;
  url:  string;
  hash?: string;
  timestamp:  Date;
}