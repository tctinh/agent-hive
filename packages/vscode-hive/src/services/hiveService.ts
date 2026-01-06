import * as fs from 'fs'
import * as path from 'path'
import { Feature, Step, StepStatus, RequirementsDocs, ContextDocs, Batch, StepReport, ExecutionInfo, PlanJson, PlanComment } from '../types'

export interface SessionItem {
  id: string
  title?: string
  summary?: string
  isParent: boolean
  createdAt: number
  updatedAt: number
}

export class HiveService {
  private basePath: string

  constructor(workspaceRoot: string) {
    this.basePath = path.join(workspaceRoot, '.hive')
  }

  exists(): boolean {
    return fs.existsSync(this.basePath)
  }

  private detectFeatureVersion(featurePath: string): 'v1' | 'v2' {
    const tasksPath = path.join(featurePath, 'tasks')
    const executionPath = path.join(featurePath, 'execution')
    
    if (fs.existsSync(tasksPath)) {
      return 'v2'
    }
    if (fs.existsSync(executionPath)) {
      return 'v1'
    }
    return 'v2'
  }

  private getStepsPath(featurePath: string): string {
    const version = this.detectFeatureVersion(featurePath)
    return version === 'v2' 
      ? path.join(featurePath, 'tasks')
      : path.join(featurePath, 'execution')
  }

  private getDecisionsPath(featurePath: string): string {
    const version = this.detectFeatureVersion(featurePath)
    const decisionsPath = path.join(featurePath, 'context', 'decisions')
    
    if (version === 'v2' && fs.existsSync(decisionsPath)) {
      return decisionsPath
    }
    return path.join(featurePath, 'context')
  }

  getFeatures(): Feature[] {
    const featuresPath = path.join(this.basePath, 'features')
    if (!fs.existsSync(featuresPath)) return []

    return fs.readdirSync(featuresPath)
      .filter(f => fs.statSync(path.join(featuresPath, f)).isDirectory())
      .map(name => this.getFeature(name))
  }

  getFeature(name: string): Feature {
    const steps = this.getSteps(name)
    const activeSteps = steps.filter(s => s.status !== 'cancelled')
    const doneCount = activeSteps.filter(s => s.status === 'done').length
    const stepsCount = activeSteps.length
    const progress = stepsCount > 0 ? Math.round((doneCount / stepsCount) * 100) : 0

    const featureJsonPath = path.join(this.basePath, 'features', name, 'feature.json')
    const featureJson = this.readJson<{ status?: string; createdAt?: string; completedAt?: string }>(featureJsonPath)
    const status = (featureJson?.status as Feature['status']) || 'active'
    const createdAt = featureJson?.createdAt
    const completedAt = featureJson?.completedAt

    return { name, progress, steps, stepsCount, doneCount, status, createdAt, completedAt }
  }

  getDecisions(feature: string): { filename: string; title: string; filePath: string }[] {
    const featurePath = path.join(this.basePath, 'features', feature)
    const decisionsPath = this.getDecisionsPath(featurePath)
    if (!fs.existsSync(decisionsPath)) return []

    return fs.readdirSync(decisionsPath)
      .filter(f => f.endsWith('.md'))
      .map(filename => {
        const filePath = path.join(decisionsPath, filename)
        const content = this.readFile(filePath)
        let title = filename.replace(/\.md$/, '')
        if (content) {
          const h1Match = content.match(/^#\s+(.+)$/m)
          if (h1Match) title = h1Match[1]
        }
        return { filename, title, filePath }
      })
      .sort((a, b) => a.filename.localeCompare(b.filename))
  }

  getSteps(feature: string): Step[] {
    const featurePath = path.join(this.basePath, 'features', feature)
    const stepsPath = this.getStepsPath(featurePath)
    if (!fs.existsSync(stepsPath)) return []

    return fs.readdirSync(stepsPath)
      .filter(f => {
        const stat = fs.statSync(path.join(stepsPath, f))
        return stat.isDirectory()
      })
      .map(folder => {
        const folderPath = path.join(stepsPath, folder)
        const statusPath = path.join(folderPath, 'status.json')
        const status = this.readJson<StepStatus>(statusPath)
        
        const specFiles = fs.readdirSync(folderPath)
          .filter(f => f.endsWith('.md'))
        
        if (!status) return null
        
        return {
          name: status.name,
          order: status.order,
          status: status.status,
          folderPath: folder,
          specFiles,
          sessionId: status.sessionId,
          summary: status.summary,
          startedAt: status.startedAt,
          completedAt: status.completedAt,
          execution: status.execution
        } as Step
      })
      .filter((s): s is Step => s !== null)
      .sort((a, b) => a.order - b.order)
  }

  getBatches(feature: string): Batch[] {
    const steps = this.getSteps(feature)
    const stepsByOrder: Map<number, Step[]> = new Map()
    
    for (const step of steps) {
      if (!stepsByOrder.has(step.order)) {
        stepsByOrder.set(step.order, [])
      }
      stepsByOrder.get(step.order)!.push(step)
    }
    
    const sortedOrders = Array.from(stepsByOrder.keys()).sort((a, b) => a - b)
    const result: Batch[] = []
    
    let highestCompletedOrder = -1
    for (const order of sortedOrders) {
      const batchSteps = stepsByOrder.get(order)!
      const allDone = batchSteps.every(s => s.status === 'done')
      if (allDone) {
        highestCompletedOrder = order
      }
    }
    
    let firstPendingOrder = -1
    for (const order of sortedOrders) {
      const batchSteps = stepsByOrder.get(order)!
      const allDone = batchSteps.every(s => s.status === 'done')
      if (!allDone && firstPendingOrder === -1) {
        firstPendingOrder = order
        break
      }
    }
    
    for (const order of sortedOrders) {
      const batchSteps = stepsByOrder.get(order)!
      result.push({
        order,
        steps: batchSteps,
        isLatestDone: order === highestCompletedOrder,
        canExecute: order === firstPendingOrder
      })
    }
    
    return result
  }

  getStepReport(feature: string, stepFolder: string): StepReport | null {
    const featurePath = path.join(this.basePath, 'features', feature)
    const stepsPath = this.getStepsPath(featurePath)
    const reportPath = path.join(stepsPath, stepFolder, 'report.json')
    const report = this.readJson<{ diffStats?: StepReport }>(reportPath)
    if (!report?.diffStats) return null
    return report.diffStats
  }

  getStepDiffPath(feature: string, stepFolder: string): string | null {
    const featurePath = path.join(this.basePath, 'features', feature)
    const stepsPath = this.getStepsPath(featurePath)
    const diffPath = path.join(stepsPath, stepFolder, 'output.diff')
    if (!fs.existsSync(diffPath)) return null
    return diffPath
  }

  formatDuration(startedAt?: string, completedAt?: string): string {
    if (!startedAt || !completedAt) return ''
    const start = new Date(startedAt).getTime()
    const end = new Date(completedAt).getTime()
    const seconds = Math.floor((end - start) / 1000)
    
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    if (minutes < 60) return `${minutes}m ${remainingSeconds}s`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}m`
  }

  getStepSpec(feature: string, stepFolder: string, specFile: string): string | null {
    const featurePath = path.join(this.basePath, 'features', feature)
    const stepsPath = this.getStepsPath(featurePath)
    const specPath = path.join(stepsPath, stepFolder, specFile)
    return this.readFile(specPath)
  }

  getStepStatus(feature: string, stepFolder: string): StepStatus | null {
    const featurePath = path.join(this.basePath, 'features', feature)
    const stepsPath = this.getStepsPath(featurePath)
    const statusPath = path.join(stepsPath, stepFolder, 'status.json')
    return this.readJson<StepStatus>(statusPath)
  }

  getProblemContent(feature: string): string | null {
    const featurePath = path.join(this.basePath, 'features', feature)
    
    const problemPath = path.join(featurePath, 'context', 'problem.md')
    if (fs.existsSync(problemPath)) {
      return this.readFile(problemPath)
    }
    
    const ticketPath = path.join(featurePath, 'requirements', 'ticket.md')
    if (fs.existsSync(ticketPath)) {
      return this.readFile(ticketPath)
    }
    
    const legacyProblemPath = path.join(featurePath, 'problem', 'ticket.md')
    return this.readFile(legacyProblemPath)
  }

  getRequirements(feature: string): RequirementsDocs {
    const ticket = this.getProblemContent(feature)
    return {
      ticket: ticket ?? undefined,
      requirements: undefined,
      notes: undefined
    }
  }

  getContext(feature: string): ContextDocs {
    const decisions = this.getDecisions(feature)
    const decisionContent = decisions.length > 0 
      ? decisions.map(d => `### ${d.title}`).join('\n\n')
      : undefined
    
    return {
      decisions: decisionContent,
      architecture: undefined,
      constraints: undefined
    }
  }

  getPlanJson(feature: string): PlanJson | null {
    const featurePath = path.join(this.basePath, 'features', feature)
    
    const jsonPath = path.join(featurePath, 'plan.json')
    if (fs.existsSync(jsonPath)) {
      return this.readJson<PlanJson>(jsonPath)
    }
    
    return null
  }

  getPlanContent(feature: string): string | null {
    const planJson = this.getPlanJson(feature)
    if (planJson) {
      return this.planJsonToMarkdown(planJson)
    }
    
    const legacyPath = path.join(this.basePath, 'features', feature, 'plan.md')
    return this.readFile(legacyPath)
  }

  private planJsonToMarkdown(plan: PlanJson): string {
    const lines: string[] = []
    lines.push(`# Implementation Plan`)
    lines.push(``)
    lines.push(`**Version**: ${plan.version}`)
    lines.push(`**Status**: ${plan.status}`)
    lines.push(`**Updated**: ${plan.updatedAt}`)
    lines.push(``)
    
    if (plan.summary) {
      lines.push(`## Summary`)
      lines.push(``)
      lines.push(plan.summary)
      lines.push(``)
    }
    
    if (plan.tasks.length > 0) {
      lines.push(`## Tasks`)
      lines.push(``)
      for (const task of plan.tasks) {
        const icon = task.status === 'done' ? '✅' :
                     task.status === 'in_progress' ? '🔄' :
                     task.status === 'cancelled' ? '⏭️' : '⬜'
        lines.push(`${icon} **${task.id}**: ${task.name}`)
      }
    }
    
    return lines.join('\n')
  }

  getPlanComments(feature: string): PlanComment[] {
    const commentsPath = path.join(this.basePath, 'features', feature, 'comments.json')
    if (!fs.existsSync(commentsPath)) return []
    
    try {
      const data = JSON.parse(fs.readFileSync(commentsPath, 'utf-8'))
      return data.comments || []
    } catch {
      return []
    }
  }

  getFilesInFolder(feature: string, folder: 'requirements' | 'context'): string[] {
    const featurePath = path.join(this.basePath, 'features', feature)
    
    if (folder === 'context') {
      const decisionsPath = this.getDecisionsPath(featurePath)
      if (fs.existsSync(decisionsPath)) {
        return fs.readdirSync(decisionsPath).filter(f => {
          const stat = fs.statSync(path.join(decisionsPath, f))
          return stat.isFile()
        })
      }
    }
    
    let folderPath = path.join(featurePath, folder)
    if (!fs.existsSync(folderPath)) {
      if (folder === 'requirements') {
        folderPath = path.join(featurePath, 'problem')
      } else {
        return []
      }
    }
    if (!fs.existsSync(folderPath)) return []
    return fs.readdirSync(folderPath).filter(f => {
      const stat = fs.statSync(path.join(folderPath, f))
      return stat.isFile()
    })
  }

  getFilePath(feature: string, folder: 'requirements' | 'context' | 'execution', filename: string): string {
    const featurePath = path.join(this.basePath, 'features', feature)
    
    if (folder === 'requirements') {
      const problemPath = path.join(featurePath, 'context', 'problem.md')
      if (fs.existsSync(problemPath) && filename === 'ticket.md') {
        return problemPath
      }
      const requirementsPath = path.join(featurePath, 'requirements')
      if (fs.existsSync(requirementsPath)) {
        return path.join(requirementsPath, filename)
      }
      return path.join(featurePath, 'problem', filename)
    }
    
    if (folder === 'context') {
      const decisionsPath = this.getDecisionsPath(featurePath)
      return path.join(decisionsPath, filename)
    }
    
    if (folder === 'execution') {
      const stepsPath = this.getStepsPath(featurePath)
      return path.join(stepsPath, filename)
    }
    
    return path.join(featurePath, folder, filename)
  }

  getStepFilePath(feature: string, stepFolder: string, filename: string): string {
    const featurePath = path.join(this.basePath, 'features', feature)
    const stepsPath = this.getStepsPath(featurePath)
    return path.join(stepsPath, stepFolder, filename)
  }

  getFeaturePath(feature: string): string {
    return path.join(this.basePath, 'features', feature)
  }

  getReport(feature: string): string {
    const feat = this.getFeature(feature)
    const requirements = this.getRequirements(feature)
    const context = this.getContext(feature)
    
    let report = `# Feature: ${feature}\n\n`
    report += `## REQUIREMENTS\n${requirements.ticket || '(no ticket)'}\n\n`
    
    report += `## CONTEXT\n`
    if (context.decisions) report += context.decisions + '\n'
    if (context.architecture) report += context.architecture + '\n'
    if (!context.decisions && !context.architecture) report += '(no decisions)\n'
    report += '\n'
    
    report += `## EXECUTION\n`
    for (const step of feat.steps) {
      const icon = step.status === 'done' ? '✅' : step.status === 'in_progress' ? '🔄' : '⬜'
      report += `${icon} **${step.order}. ${step.name}** (${step.status})`
      if (step.sessionId) report += ` [session: ${step.sessionId}]`
      report += '\n'
      if (step.summary) report += `   ${step.summary}\n`
    }
    
    return report
  }

  updateStepSession(feature: string, stepFolder: string, sessionId: string): boolean {
    const featurePath = path.join(this.basePath, 'features', feature)
    const stepsPath = this.getStepsPath(featurePath)
    const statusPath = path.join(stepsPath, stepFolder, 'status.json')
    const status = this.readJson<StepStatus>(statusPath)
    if (!status) return false
    
    status.sessionId = sessionId
    try {
      fs.writeFileSync(statusPath, JSON.stringify(status, null, 2))
      return true
    } catch {
      return false
    }
  }

  async getStepSessions(feature: string, stepFolder: string): Promise<SessionItem[]> {
    const status = this.getStepStatus(feature, stepFolder)
    if (!status?.sessionId) return []

    const workspaceRoot = path.dirname(this.basePath)
    
    try {
      const { createOpencodeClient } = await import('@opencode-ai/sdk')
      const client = createOpencodeClient({ directory: workspaceRoot })
      const response = await client.session.list({ query: { directory: workspaceRoot } })
      
      if (response.error || !response.data) return []
      const sessions = response.data
      
      const parentSession = sessions.find((s: { id: string }) => s.id === status.sessionId)
      if (!parentSession) return []

      const result: SessionItem[] = [{
        id: parentSession.id,
        title: parentSession.title,
        summary: parentSession.summary ? `+${parentSession.summary.additions}/-${parentSession.summary.deletions} in ${parentSession.summary.files} files` : undefined,
        isParent: true,
        createdAt: parentSession.time.created,
        updatedAt: parentSession.time.updated
      }]

      const childSessions = sessions
        .filter((s: { parentID?: string }) => s.parentID === status.sessionId)
        .sort((a: { time: { created: number } }, b: { time: { created: number } }) => 
          a.time.created - b.time.created)

      for (const child of childSessions) {
        result.push({
          id: child.id,
          title: child.title,
          summary: child.summary ? `+${child.summary.additions}/-${child.summary.deletions} in ${child.summary.files} files` : undefined,
          isParent: false,
          createdAt: child.time.created,
          updatedAt: child.time.updated
        })
      }

      return result
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
