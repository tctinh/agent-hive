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

export type TaskStatusType = 'pending' | 'in_progress' | 'done' | 'cancelled' | 'blocked' | 'failed' | 'partial';
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

/** Worker session information for background task execution */
export interface WorkerSession {
  /** Background task ID from OMO-Slim */
  taskId?: string;
  /** Unique session identifier */
  sessionId: string;
  /** Worker instance identifier */
  workerId?: string;
  /** Agent type handling this task */
  agent?: string;
  /** Execution mode: inline (same session) or delegate (background) */
  mode?: 'inline' | 'delegate';
  /** ISO timestamp of last heartbeat */
  lastHeartbeatAt?: string;
  /** Current attempt number (1-based) */
  attempt?: number;
  /** Number of messages exchanged in session */
  messageCount?: number;
}

export interface TaskStatus {
  /** Schema version for forward compatibility (default: 1) */
  schemaVersion?: number;
  status: TaskStatusType;
  origin: TaskOrigin;
  planTitle?: string;
  summary?: string;
  startedAt?: string;
  completedAt?: string;
  baseCommit?: string;
  subtasks?: Subtask[];
  /** Idempotency key for safe retries */
  idempotencyKey?: string;
  /** Worker session info for background execution */
  workerSession?: WorkerSession;
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

/** Agent model/temperature configuration */
export interface AgentModelConfig {
  /** Model to use - format: "provider/model-id" (e.g., 'anthropic/claude-sonnet-4-20250514') */
  model?: string;
  /** Temperature for generation (0-2) */
  temperature?: number;
  /** Skills to enable for this agent */
  skills?: string[];
}

export interface HiveConfig {
  /** Schema reference for config file */
  $schema?: string;
  /** Enable hive tools for specific features */
  enableToolsFor?: string[];
  /** Enable OMO-Slim delegation (optional integration) */
  omoSlimEnabled?: boolean;
  /** Agent configuration */
  agents?: {
    /** Hive (hybrid planner + orchestrator) */
    hive?: AgentModelConfig;
    /** Architect (planning-only) */
    architect?: AgentModelConfig;
    /** Swarm (orchestrator) */
    swarm?: AgentModelConfig;
    /** Scout (research) */
    scout?: AgentModelConfig;
    /** Forager (worker) */
    forager?: AgentModelConfig;
    /** Hygienic (plan review) */
    hygienic?: AgentModelConfig;
  };
}

/** Default models for Hive agents */
export const DEFAULT_AGENT_MODELS = {
  hive: 'google/antigravity-claude-opus-4-5-thinking',
  architect: 'google/antigravity-claude-opus-4-5-thinking',
  swarm: 'github-copilot/claude-opus-4-5',
  scout: 'zai-coding-plan/glm-4.7',
  forager: 'github-copilot/gpt-5.2-codex',
  hygienic: 'github-copilot/gpt-5.2-codex',
} as const;

export const DEFAULT_HIVE_CONFIG: HiveConfig = {
  $schema: 'https://raw.githubusercontent.com/tctinh/agent-hive/main/packages/opencode-hive/schema/agent_hive.schema.json',
  enableToolsFor: [],
  agents: {
    hive: {
      model: DEFAULT_AGENT_MODELS.hive,
      temperature: 0.5,
      skills: [
        'brainstorming',
        'writing-plans',
        'dispatching-parallel-agents',
        'executing-plans',
      ],
    },
    architect: {
      model: DEFAULT_AGENT_MODELS.architect,
      temperature: 0.7,
      skills: ['brainstorming', 'writing-plans'],
    },
    swarm: {
      model: DEFAULT_AGENT_MODELS.swarm,
      temperature: 0.5,
      skills: ['dispatching-parallel-agents', 'executing-plans'],
    },
    scout: {
      model: DEFAULT_AGENT_MODELS.scout,
      temperature: 0.5,
      skills: [],
    },
    forager: {
      model: DEFAULT_AGENT_MODELS.forager,
      temperature: 0.3,
      skills: ['test-driven-development', 'verification-before-completion'],
    },
    hygienic: {
      model: DEFAULT_AGENT_MODELS.hygienic,
      temperature: 0.3,
      skills: ['systematic-debugging'],
    },
  },
};
