export interface Feature {
  name: string
  progress: number
  steps: Step[]
  stepsCount: number
  doneCount: number
  status: 'active' | 'completed' | 'archived'
  createdAt?: string
  completedAt?: string
}

export interface Decision {
  filename: string
  title: string
  filePath: string
}

export interface Step {
  name: string
  order: number
  status: 'pending' | 'in_progress' | 'done' | 'blocked' | 'cancelled' | 'reverted'
  folderPath: string
  specFiles: string[]
  sessionId?: string
  summary?: string
  startedAt?: string
  completedAt?: string
  execution?: ExecutionInfo
}

export interface ExecutionInfo {
  worktreeBranch?: string
  worktreePath?: string
  appliedAt?: string
  canRevert: boolean
}

export interface StepStatus {
  name: string
  order: number
  status: 'pending' | 'in_progress' | 'done' | 'blocked' | 'cancelled' | 'reverted'
  sessionId?: string
  startedAt?: string
  completedAt?: string
  summary?: string
  execution?: ExecutionInfo | null
}

export interface StepReport {
  filesChanged: number
  insertions: number
  deletions: number
}

export interface Batch {
  order: number
  steps: Step[]
  isLatestDone: boolean
  canExecute: boolean
}

export interface RequirementsDocs {
  ticket?: string
  requirements?: string
  notes?: string
}

export interface ContextDocs {
  decisions?: string
  architecture?: string
  constraints?: string
}

export type PlanStatusType = 'draft' | 'review' | 'approved' | 'locked'
export type TaskStatusType = 'pending' | 'in_progress' | 'done' | 'blocked' | 'reverted' | 'failed' | 'cancelled'

export interface PlanTask {
  id: string
  order: number
  name: string
  status: TaskStatusType
  spec: string
  dependencies?: string[]
}

export interface PlanDecision {
  title: string
  file: string
  loggedAt?: string
}

export interface PlanJson {
  version: number
  status: PlanStatusType
  createdAt: string
  updatedAt: string
  summary: string
  tasks: PlanTask[]
  decisions: PlanDecision[]
}

export interface PlanComment {
  id: string
  author: string
  content: string
  createdAt: string
  citations?: string[]
  taskId?: string
  status?: 'unresolved' | 'addressed' | 'rejected' | 'deferred'
  response?: string
}
