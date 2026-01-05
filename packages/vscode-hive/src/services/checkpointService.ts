import * as fs from 'fs'
import * as path from 'path'
import simpleGit, { SimpleGit } from 'simple-git'
import { Step, StepStatus } from '../types'

export interface ExecutionInfo {
  worktreeBranch: string
  worktreePath: string
  appliedAt?: string
  canRevert: boolean
}

export interface ExtendedStepStatus extends StepStatus {
  execution?: ExecutionInfo | null
}

export interface ExecutionState {
  step: Step
  status: ExtendedStepStatus
  canRevert: boolean
  diffPath: string | null
  diffExists: boolean
}

export interface RevertResult {
  success: boolean
  error?: string
  filesAffected?: string[]
}

export interface ConflictCheckResult {
  hasConflicts: boolean
  conflictDetails?: string
}

export interface ChangedFile {
  path: string
  status: 'added' | 'modified' | 'deleted'
}

export class CheckpointService {
  private basePath: string
  private workspaceRoot: string
  private git: SimpleGit

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot
    this.basePath = path.join(workspaceRoot, '.hive')
    this.git = simpleGit(workspaceRoot)
  }

  /**
   * Get full execution state for a step including revert capability
   */
  getExecutionState(feature: string, stepFolder: string): ExecutionState | null {
    const stepPath = path.join(this.basePath, 'features', feature, 'execution', stepFolder)
    const statusPath = path.join(stepPath, 'status.json')
    const diffPath = path.join(stepPath, 'output.diff')

    const status = this.readJson<ExtendedStepStatus>(statusPath)
    if (!status) return null

    const diffExists = fs.existsSync(diffPath)
    const canRevert = status.status === 'done' && 
                      status.execution?.canRevert === true && 
                      diffExists

    return {
      step: {
        name: status.name,
        order: status.order,
        status: status.status as Step['status'],
        folderPath: stepFolder,
        specFiles: this.getSpecFiles(stepPath),
        sessionId: status.sessionId,
        summary: status.summary
      },
      status,
      canRevert,
      diffPath: diffExists ? diffPath : null,
      diffExists
    }
  }

  /**
   * Check if a step can be reverted
   */
  canRevert(feature: string, stepFolder: string): boolean {
    const state = this.getExecutionState(feature, stepFolder)
    return state?.canRevert ?? false
  }

  /**
   * Check for conflicts before reverting (async)
   */
  async checkConflicts(feature: string, stepFolder: string): Promise<ConflictCheckResult> {
    const state = this.getExecutionState(feature, stepFolder)
    if (!state?.diffPath) {
      return { hasConflicts: true, conflictDetails: 'No diff file found' }
    }

    const diffContent = this.readFile(state.diffPath)
    if (!diffContent) {
      return { hasConflicts: true, conflictDetails: 'Could not read diff file' }
    }

    try {
      await this.git.applyPatch(diffContent, ['--check', '-R'])
      return { hasConflicts: false }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown conflict'
      return { hasConflicts: true, conflictDetails: message }
    }
  }

  /**
   * Revert a single step using its saved diff (async)
   */
  async revertStep(feature: string, stepFolder: string): Promise<RevertResult> {
    const state = this.getExecutionState(feature, stepFolder)
    if (!state) {
      return { success: false, error: 'Step not found' }
    }
    if (!state.canRevert) {
      return { success: false, error: 'Step cannot be reverted' }
    }
    if (!state.diffPath) {
      return { success: false, error: 'No diff file found' }
    }

    const conflictCheck = await this.checkConflicts(feature, stepFolder)
    if (conflictCheck.hasConflicts) {
      return { success: false, error: `Conflicts detected: ${conflictCheck.conflictDetails}` }
    }

    const diffContent = this.readFile(state.diffPath)
    if (!diffContent) {
      return { success: false, error: 'Could not read diff file' }
    }

    try {
      await this.git.applyPatch(diffContent, ['-R'])

      const filesAffected = this.parseFilesFromDiff(state.diffPath)
      this.updateStepAfterRevert(feature, stepFolder)

      return { success: true, filesAffected }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return { success: false, error: message }
    }
  }

  /**
   * Revert all steps in a batch (same order number) - async
   */
  async revertBatch(feature: string, batchOrder: number): Promise<RevertResult[]> {
    const steps = this.getStepsInBatch(feature, batchOrder)
    const results: RevertResult[] = []

    for (const step of steps) {
      const result = await this.revertStep(feature, step.folderPath)
      results.push(result)
    }

    return results
  }

  /**
   * Get the diff content for a step
   */
  getDiff(feature: string, stepFolder: string): string | null {
    const diffPath = path.join(
      this.basePath, 'features', feature, 'execution', stepFolder, 'output.diff'
    )
    return this.readFile(diffPath)
  }

  /**
   * Get changed files from a step's diff
   */
  getChangedFiles(feature: string, stepFolder: string): ChangedFile[] {
    const diffContent = this.getDiff(feature, stepFolder)
    if (!diffContent) return []

    const files: ChangedFile[] = []
    const lines = diffContent.split('\n')

    for (const line of lines) {
      if (line.startsWith('diff --git')) {
        const match = line.match(/diff --git a\/(.+) b\/(.+)/)
        if (match) {
          files.push({ path: match[2], status: 'modified' })
        }
      } else if (line.startsWith('new file mode')) {
        if (files.length > 0) {
          files[files.length - 1].status = 'added'
        }
      } else if (line.startsWith('deleted file mode')) {
        if (files.length > 0) {
          files[files.length - 1].status = 'deleted'
        }
      }
    }

    return files
  }

  /**
   * Get steps that belong to a specific batch
   */
  getStepsInBatch(feature: string, batchOrder: number): Step[] {
    const execPath = path.join(this.basePath, 'features', feature, 'execution')
    if (!fs.existsSync(execPath)) return []

    const steps: Step[] = []
    const folders = fs.readdirSync(execPath).filter(f => 
      fs.statSync(path.join(execPath, f)).isDirectory()
    )

    for (const folder of folders) {
      const state = this.getExecutionState(feature, folder)
      if (state && state.status.order === batchOrder && state.canRevert) {
        steps.push(state.step)
      }
    }

    return steps.sort((a, b) => a.name.localeCompare(b.name))
  }

  /**
   * Get all revertible steps for a feature
   */
  getRevertibleSteps(feature: string): Step[] {
    const execPath = path.join(this.basePath, 'features', feature, 'execution')
    if (!fs.existsSync(execPath)) return []

    const steps: Step[] = []
    const folders = fs.readdirSync(execPath).filter(f => 
      fs.statSync(path.join(execPath, f)).isDirectory()
    )

    for (const folder of folders) {
      const state = this.getExecutionState(feature, folder)
      if (state?.canRevert) {
        steps.push(state.step)
      }
    }

    return steps.sort((a, b) => a.order - b.order)
  }

  private parseFilesFromDiff(diffPath: string): string[] {
    const content = this.readFile(diffPath)
    if (!content) return []

    const files: string[] = []
    const lines = content.split('\n')

    for (const line of lines) {
      if (line.startsWith('diff --git')) {
        const match = line.match(/diff --git a\/(.+) b\/(.+)/)
        if (match) {
          files.push(match[2])
        }
      }
    }

    return [...new Set(files)]
  }

  private updateStepAfterRevert(feature: string, stepFolder: string): void {
    const statusPath = path.join(
      this.basePath, 'features', feature, 'execution', stepFolder, 'status.json'
    )
    const status = this.readJson<ExtendedStepStatus>(statusPath)
    if (!status) return

    status.status = 'pending'
    if (status.execution) {
      status.execution.canRevert = false
    }

    try {
      fs.writeFileSync(statusPath, JSON.stringify(status, null, 2))
    } catch {
      /* intentional: status update is best-effort */
    }
  }

  private getSpecFiles(stepPath: string): string[] {
    try {
      return fs.readdirSync(stepPath).filter(f => f.endsWith('.md'))
    } catch {
      return []
    }
  }

  private readFile(filePath: string): string | null {
    try {
      return fs.readFileSync(filePath, 'utf-8')
    } catch {
      return null
    }
  }

  private readJson<T>(filePath: string): T | null {
    const content = this.readFile(filePath)
    if (!content) return null
    try {
      return JSON.parse(content)
    } catch {
      return null
    }
  }
}
