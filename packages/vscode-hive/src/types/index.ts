export type PlanStatusType = 'draft' | 'approved' | 'locked'

export interface PlanMetadata {
  version: number
  status: PlanStatusType
  generatedAt: string
  lastUpdatedAt: string
  approvedAt: string | null
  approvedBy: 'user' | null
}

export interface Feature {
  name: string
  progress: number
  steps: Step[]
  stepsCount: number
  doneCount: number
  status: 'active' | 'completed' | 'archived'
  createdAt?: string
  completedAt?: string
  plan?: PlanMetadata
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
