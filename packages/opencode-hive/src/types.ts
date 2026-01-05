export interface ExecutionInfo {
  worktreeBranch: string;
  worktreePath: string;
  baseCommit: string;
  appliedAt?: string;
  canRevert: boolean;
}

export interface SessionInfo {
  sessionId: string;
  lastActive: string;
}

export type StepStatusType = "pending" | "in_progress" | "done" | "blocked" | "reverted" | "failed" | "cancelled";

export interface StepStatus {
  name: string;
  order: number;
  status: StepStatusType;
  startedAt?: string;
  completedAt?: string;
  summary?: string;
  sessionId?: string;
  sessionTitle?: string;
  execution?: ExecutionInfo | null;
  sessions?: {
    opencode?: SessionInfo;
  };
}

export interface FeatureStatus {
  name: string;
  createdAt: string;
  status: "active" | "completed" | "archived";
}

export interface ReportJson {
  feature: string;
  status: string;
  steps: Array<{
    folder: string;
    name: string;
    order: number;
    status: string;
    summary?: string;
    execution?: ExecutionInfo | null;
  }>;
  decisions: string[];
  generatedAt: string;
}

export interface StepWithFolder extends StepStatus {
  folder: string;
  spec?: string;
}

export interface BatchInfo {
  order: number;
  parallel: boolean;
  steps: Array<{
    folder: string;
    name: string;
    status: StepStatusType;
  }>;
}

export interface FeatureListItem {
  name: string;
  status: string;
  isActive: boolean;
  stepsCount: number;
  doneCount: number;
}

export interface StatusResponse {
  feature: string;
  featureStatus: string;
  totalSteps: number;
  completed: number;
  batches: BatchInfo[];
  nextPending?: string;
  inProgress: string[];
}

export interface HiveDirectoryConfig {
  directory: string;
  hivePath: string;
  featuresPath: string;
}

export interface StepExecutionContext {
  featureName: string;
  stepFolder: string;
  stepName: string;
  order: number;
  worktreePath?: string;
  branch?: string;
}
