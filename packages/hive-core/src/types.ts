export type FeatureStatusType = 'planning' | 'approved' | 'executing' | 'completed';

export interface FeatureJson {
  name: string;
  status: FeatureStatusType;
  ticket?: string;
  sessionId?: string;
  createdAt: string;
  approvedAt?: string;
  completedAt?: string;
}

export type TaskStatusType = 'pending' | 'in_progress' | 'done' | 'cancelled' | 'blocked';
export type TaskOrigin = 'plan' | 'manual';
export type SubtaskType = 'test' | 'implement' | 'review' | 'verify' | 'research' | 'debug' | 'custom';

export interface Subtask {
  id: string;
  name: string;
  folder: string;
  status: TaskStatusType;
  type?: SubtaskType;
  createdAt?: string;
  completedAt?: string;
}

export interface SubtaskStatus {
  status: TaskStatusType;
  type?: SubtaskType;
  createdAt: string;
  completedAt?: string;
}

export interface TaskStatus {
  status: TaskStatusType;
  origin: TaskOrigin;
  planTitle?: string;
  summary?: string;
  startedAt?: string;
  completedAt?: string;
  baseCommit?: string;
  subtasks?: Subtask[];
}

export interface PlanComment {
  id: string;
  line: number;
  body: string;
  author: string;
  timestamp: string;
}

export interface CommentsJson {
  threads: PlanComment[];
}

export interface PlanReadResult {
  content: string;
  status: FeatureStatusType;
  comments: PlanComment[];
}

export interface TasksSyncResult {
  created: string[];
  removed: string[];
  kept: string[];
  manual: string[];
}

export interface TaskInfo {
  folder: string;
  name: string;
  status: TaskStatusType;
  origin: TaskOrigin;
  planTitle?: string;
  summary?: string;
}

export interface FeatureInfo {
  name: string;
  status: FeatureStatusType;
  tasks: TaskInfo[];
  hasPlan: boolean;
  commentCount: number;
}

export interface ContextFile {
  name: string;
  content: string;
  updatedAt: string;
}

export interface SessionInfo {
  sessionId: string;
  taskFolder?: string;
  startedAt: string;
  lastActiveAt: string;
  messageCount?: number;
}

export interface SessionsJson {
  master?: string;
  sessions: SessionInfo[];
}

export interface TaskSpec {
  taskFolder: string;
  featureName: string;
  planSection: string;
  context: string;
  priorTasks: Array<{ folder: string; summary?: string }>;
}

/** Agent model/temperature configuration (matches OMO-Slim pattern) */
export interface AgentModelConfig {
  /** Model to use - format: "provider/model-id" (e.g., 'anthropic/claude-sonnet-4-20250514') */
  model?: string;
  /** Temperature for generation (0-2) */
  temperature?: number;
  /** Skills to enable for this agent */
  skills?: string[];
}

export interface HiveConfig {
  /** Enable hive tools for specific features */
  enableToolsFor?: string[];
  /** Agent configuration */
  agents?: {
    worker: {
      visible: boolean;
    };
    /** Hive Master agent config */
    hive?: AgentModelConfig;
    /** Forager worker agent config */
    forager?: AgentModelConfig;
  };
  /** OMO-Slim integration settings */
  omoSlim?: {
    /** Enable delegated execution via OMO-Slim background tasks */
    enabled: boolean;
  };
}

/** Default models for Hive agents (like OMO-Slim's DEFAULT_MODELS) */
export const DEFAULT_AGENT_MODELS = {
  hive: 'anthropic/claude-sonnet-4-20250514',
  forager: 'anthropic/claude-sonnet-4-20250514',
} as const;

export const DEFAULT_HIVE_CONFIG: HiveConfig = {
  enableToolsFor: [],
  agents: {
    worker: {
      visible: true,
    },
    hive: {
      model: DEFAULT_AGENT_MODELS.hive,
      temperature: 0.7,
      skills: ['*'],
    },
    forager: {
      model: DEFAULT_AGENT_MODELS.forager,
      temperature: 0.3,
      skills: [],
    },
  },
  omoSlim: {
    enabled: false,
  },
};
