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

export interface FeatureDirectoryInfo {
  directoryName: string;
  logicalName: string;
  index: number | null;
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

export interface ManualTaskMetadata {
  goal?: string;
  description?: string;
  acceptanceCriteria?: string[];
  references?: string[];
  files?: string[];
  reason?: string;
  source?: 'review' | 'operator' | 'ad_hoc';
  dependsOn?: string[];
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
  /**
   * Task dependencies expressed as task folder names (e.g., '01-setup', '02-core-api').
   * A task cannot start until all its dependencies have status 'done'.
   * Resolved from plan.md dependency annotations during hive_tasks_sync.
   */
  dependsOn?: string[];
  /** Structured metadata for manual tasks */
  metadata?: ManualTaskMetadata;
}

export type ReviewDocument = 'plan';

export interface ReviewThread {
  id: string;
  line: number;
  body: string;
  replies: string[];
}

export interface CommentsJson {
  threads: ReviewThread[];
}

export interface ReviewCounts {
  plan: number;
}

export type PlanComment = ReviewThread;

export interface PlanReadResult {
  content: string;
  status: FeatureStatusType;
  comments: ReviewThread[];
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
  reviewCounts: ReviewCounts;
}

export type ContextRole = 'human' | 'scratchpad' | 'operational' | 'durable';

export interface ContextFile {
  name: string;
  content: string;
  updatedAt: string;
  role: ContextRole;
  includeInExecution: boolean;
  includeInAgentsMdSync: boolean;
  includeInNetwork: boolean;
}

export type SessionKind = 'primary' | 'subagent' | 'task-worker' | 'unknown';

export type DirectiveRecoveryState = 'available' | 'consumed' | 'escalated';

export interface SessionInfo {
  sessionId: string;
  featureName?: string;
  taskFolder?: string;
  agent?: string;
  baseAgent?: string;
  sessionKind?: SessionKind;
  workerPromptPath?: string;
  directivePrompt?: string;
  directiveRecoveryState?: DirectiveRecoveryState;
  replayDirectivePending?: boolean;
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
  /** Skills to enable for this agent (legacy; native skill visibility is controlled by OpenCode registration, not by this allowlist) */
  skills?: string[];
  /** Skills to auto-load for this agent */
  autoLoadSkills?: string[];
  /** Variant key for model reasoning/effort level (e.g., 'low', 'medium', 'high', 'max') */
  variant?: string;
}

export const BUILT_IN_AGENT_NAMES = [
  'hive-master',
  'architect-planner',
  'swarm-orchestrator',
  'scout-researcher',
  'forager-worker',
  'hive-helper',
  'hygienic-reviewer',
] as const;

export type BuiltInAgentName = (typeof BUILT_IN_AGENT_NAMES)[number];

export const CUSTOM_AGENT_BASES = ['forager-worker', 'hygienic-reviewer'] as const;

export type CustomAgentBase = (typeof CUSTOM_AGENT_BASES)[number];

export const CUSTOM_AGENT_RESERVED_NAMES = [
  ...BUILT_IN_AGENT_NAMES,
  'hive',
  'architect',
  'swarm',
  'scout',
  'forager',
  'hygienic',
  'receiver',
  'build',
  'plan',
  'code',
] as const;

export interface CustomAgentConfig {
  baseAgent: CustomAgentBase;
  description: string;
  model?: string;
  temperature?: number;
  variant?: string;
  autoLoadSkills?: string[];
}

export interface ResolvedCustomAgentConfig extends AgentModelConfig {
  baseAgent: CustomAgentBase;
  description: string;
}

export interface HiveConfig {
  /** Schema reference for config file */
  $schema?: string;
  /** Enable hive tools for specific features */
  enableToolsFor?: string[];
  /** Globally disable specific Hive bundled skills (excluded from materialization and autoload). Does not block user or native skills with the same name. */
  disableSkills?: string[];
  /** Globally disable specific MCP servers. Available: websearch, context7, grep_app, ast_grep */
  disableMcps?: string[];
  /** Enable OMO-Slim delegation (optional integration) */
  omoSlimEnabled?: boolean;
  /** Choose between unified or dedicated agent modes */
  agentMode?: 'unified' | 'dedicated';
  /** Agent configuration */
  agents?: {
    /** Hive Master (hybrid planner + orchestrator) */
    'hive-master'?: AgentModelConfig;
    /** Architect Planner (planning-only) */
    'architect-planner'?: AgentModelConfig;
    /** Swarm Orchestrator */
    'swarm-orchestrator'?: AgentModelConfig;
    /** Scout Researcher */
    'scout-researcher'?: AgentModelConfig;
    /** Forager Worker */
    'forager-worker'?: AgentModelConfig;
    /** Hive Helper */
    'hive-helper'?: AgentModelConfig;
    /** Hygienic Reviewer */
    'hygienic-reviewer'?: AgentModelConfig;
  };
  customAgents?: Record<string, CustomAgentConfig>;
  /** Sandbox mode for worker isolation */
  sandbox?: 'none' | 'docker';
  /** Docker image to use when sandbox is 'docker' (optional explicit override) */
  dockerImage?: string;
  /** Reuse Docker containers per worktree (default: true when sandbox is 'docker') */
  persistentContainers?: boolean;
  /** Hook execution cadence (number of turns between hook invocations). Key = hook name, Value = cadence (1 = every turn, 3 = every 3rd turn) */
  hook_cadence?: Record<string, number>;
}

/** Default models for Hive agents */
export const DEFAULT_AGENT_MODELS = {
  'hive-master': 'github-copilot/claude-opus-4.5',
  'architect-planner': 'github-copilot/gpt-5.2-codex',
  'swarm-orchestrator': 'github-copilot/claude-opus-4.5',
  'scout-researcher': 'zai-coding-plan/glm-4.7',
  'forager-worker': 'github-copilot/gpt-5.2-codex',
  'hive-helper': 'github-copilot/gpt-5.2-codex',
  'hygienic-reviewer': 'github-copilot/gpt-5.2-codex',
} as const;

export const DEFAULT_HIVE_CONFIG: HiveConfig = {
  $schema: 'https://raw.githubusercontent.com/tctinh/agent-hive/main/packages/opencode-hive/schema/agent_hive.schema.json',
  enableToolsFor: [],
  disableSkills: [],
  disableMcps: [],
  agentMode: 'unified',
  sandbox: 'none',
  customAgents: {
    'forager-example-template': {
      baseAgent: 'forager-worker',
      description: 'Example template only: rename or delete this entry before use. Do not expect planners/orchestrators to select this placeholder agent as configured.',
      model: 'anthropic/claude-sonnet-4-20250514',
      temperature: 0.2,
      variant: 'high',
      autoLoadSkills: ['test-driven-development'],
    },
    'hygienic-example-template': {
      baseAgent: 'hygienic-reviewer',
      description: 'Example template only: rename or delete this entry before use. Do not expect planners/orchestrators to select this placeholder agent as configured.',
      autoLoadSkills: ['code-reviewer'],
    },
  },
  agents: {
    'hive-master': {
      model: DEFAULT_AGENT_MODELS['hive-master'],
      temperature: 0.5,
      autoLoadSkills: ['parallel-exploration'],
    },
    'architect-planner': {
      model: DEFAULT_AGENT_MODELS['architect-planner'],
      temperature: 0.7,
      autoLoadSkills: ['parallel-exploration'],
    },
    'swarm-orchestrator': {
      model: DEFAULT_AGENT_MODELS['swarm-orchestrator'],
      temperature: 0.5,
      autoLoadSkills: [],
    },
    'scout-researcher': {
      model: DEFAULT_AGENT_MODELS['scout-researcher'],
      temperature: 0.5,
      autoLoadSkills: [],
    },
    'forager-worker': {
      model: DEFAULT_AGENT_MODELS['forager-worker'],
      temperature: 0.3,
      autoLoadSkills: ['test-driven-development', 'verification-before-completion'],
    },
    'hive-helper': {
      model: DEFAULT_AGENT_MODELS['hive-helper'],
      temperature: 0.3,
      autoLoadSkills: [],
    },
    'hygienic-reviewer': {
      model: DEFAULT_AGENT_MODELS['hygienic-reviewer'],
      temperature: 0.3,
      autoLoadSkills: [],
    },
  },
};
