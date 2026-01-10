import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import type { FeatureJson, TaskStatus, Subtask, SessionInfo, SessionsJson } from 'hive-core'

type SidebarItem = StatusGroupItem | FeatureItem | PlanItem | ContextFolderItem | ContextFileItem | TasksGroupItem | TaskItem | TaskFileItem | SubtaskItem | SessionsGroupItem | SessionItem

const STATUS_ICONS: Record<string, string> = {
  pending: 'circle-outline',
  in_progress: 'sync~spin',
  done: 'pass',
  cancelled: 'circle-slash',
  planning: 'edit',
  approved: 'check',
  executing: 'run-all',
  completed: 'pass-filled',
}

// Status group for organizing features
class StatusGroupItem extends vscode.TreeItem {
  constructor(
    public readonly groupName: string,
    public readonly groupStatus: 'in_progress' | 'pending' | 'completed',
    public readonly features: FeatureItem[],
    collapsed: boolean = false
  ) {
    super(groupName, collapsed ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.Expanded)
    
    this.description = `${features.length}`
    this.contextValue = `status-group-${groupStatus}`
    
    const icons: Record<string, string> = {
      in_progress: 'sync~spin',
      pending: 'circle-outline',
      completed: 'pass-filled',
    }
    this.iconPath = new vscode.ThemeIcon(icons[groupStatus] || 'folder')
  }
}

class FeatureItem extends vscode.TreeItem {
  constructor(
    public readonly name: string,
    public readonly feature: FeatureJson,
    public readonly taskStats: { total: number; done: number },
    public readonly isActive: boolean
  ) {
    super(name, vscode.TreeItemCollapsibleState.Collapsed)
    
    const statusLabel = feature.status.charAt(0).toUpperCase() + feature.status.slice(1)
    this.description = isActive 
      ? `${statusLabel} · ${taskStats.done}/${taskStats.total}` 
      : `${taskStats.done}/${taskStats.total}`
    
    this.contextValue = `feature-${feature.status}`
    this.iconPath = new vscode.ThemeIcon(STATUS_ICONS[feature.status] || 'package')
    
    if (isActive) {
      this.resourceUri = vscode.Uri.parse('hive:active')
    }
  }
}

class PlanItem extends vscode.TreeItem {
  constructor(
    public readonly featureName: string,
    public readonly planPath: string,
    public readonly featureStatus: string,
    public readonly commentCount: number
  ) {
    super('Plan', vscode.TreeItemCollapsibleState.None)
    
    this.description = commentCount > 0 ? `${commentCount} comment(s)` : ''
    this.contextValue = featureStatus === 'planning' ? 'plan-draft' : 'plan-approved'
    this.iconPath = new vscode.ThemeIcon('file-text')
    this.command = {
      command: 'vscode.open',
      title: 'Open Plan',
      arguments: [vscode.Uri.file(planPath)]
    }
  }
}

class ContextFolderItem extends vscode.TreeItem {
  constructor(
    public readonly featureName: string,
    public readonly contextPath: string,
    public readonly fileCount: number
  ) {
    super('Context', fileCount > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None)
    
    this.description = fileCount > 0 ? `${fileCount} file(s)` : ''
    this.contextValue = 'context-folder'
    this.iconPath = new vscode.ThemeIcon('folder')
  }
}

class ContextFileItem extends vscode.TreeItem {
  constructor(
    public readonly filename: string,
    public readonly filePath: string
  ) {
    super(filename, vscode.TreeItemCollapsibleState.None)
    
    this.contextValue = 'context-file'
    this.iconPath = new vscode.ThemeIcon(filename.endsWith('.md') ? 'markdown' : 'file')
    this.command = {
      command: 'vscode.open',
      title: 'Open File',
      arguments: [vscode.Uri.file(filePath)]
    }
  }
}

class TasksGroupItem extends vscode.TreeItem {
  constructor(
    public readonly featureName: string,
    public readonly tasks: Array<{ folder: string; status: TaskStatus }>
  ) {
    super('Tasks', tasks.length > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None)
    
    const done = tasks.filter(t => t.status.status === 'done').length
    this.description = `${done}/${tasks.length}`
    this.contextValue = 'tasks-group'
    this.iconPath = new vscode.ThemeIcon('checklist')
  }
}

class TaskItem extends vscode.TreeItem {
  constructor(
    public readonly featureName: string,
    public readonly folder: string,
    public readonly status: TaskStatus,
    public readonly specPath: string | null,
    public readonly reportPath: string | null,
    public readonly subtaskCount: number = 0,
    public readonly subtasksDone: number = 0
  ) {
    const name = folder.replace(/^\d+-/, '')
    const hasFiles = specPath !== null || reportPath !== null
    const hasSubtasks = subtaskCount > 0
    const hasChildren = hasFiles || hasSubtasks
    super(name, hasChildren ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None)
    const subtaskInfo = subtaskCount > 0 ? ` (${subtasksDone}/${subtaskCount})` : ''
    this.description = (status.summary || '') + subtaskInfo
    this.contextValue = `task-${status.status}${status.origin === 'manual' ? '-manual' : ''}`
    
    const iconName = STATUS_ICONS[status.status] || 'circle-outline'
    this.iconPath = new vscode.ThemeIcon(iconName)
    
    this.tooltip = new vscode.MarkdownString()
    this.tooltip.appendMarkdown(`**${folder}**\n\n`)
    this.tooltip.appendMarkdown(`Status: ${status.status}\n\n`)
    this.tooltip.appendMarkdown(`Origin: ${status.origin}\n\n`)
    if (status.summary) {
      this.tooltip.appendMarkdown(`Summary: ${status.summary}\n\n`)
    }
    if (subtaskCount > 0) {
      this.tooltip.appendMarkdown(`Subtasks: ${subtasksDone}/${subtaskCount} done`)
    }
  }
}

class TaskFileItem extends vscode.TreeItem {
  constructor(
    public readonly filename: string,
    public readonly filePath: string
  ) {
    super(filename, vscode.TreeItemCollapsibleState.None)
    
    this.contextValue = 'task-file'
    this.iconPath = new vscode.ThemeIcon('markdown')
    this.command = {
      command: 'vscode.open',
      title: 'Open File',
      arguments: [vscode.Uri.file(filePath)]
    }
  }
}

const SUBTASK_TYPE_ICONS: Record<string, string> = {
  test: 'beaker',
  implement: 'code',
  review: 'eye',
  verify: 'check-all',
  research: 'search',
  debug: 'debug',
  custom: 'circle-outline',
}

class SubtaskItem extends vscode.TreeItem {
  constructor(
    public readonly featureName: string,
    public readonly taskFolder: string,
    public readonly subtask: Subtask,
    public readonly subtaskPath: string
  ) {
    super(subtask.name, vscode.TreeItemCollapsibleState.None)
    
    const typeTag = subtask.type ? ` [${subtask.type}]` : ''
    const targetFile = subtask.status === 'done' ? 'report' : 'spec'
    this.description = `${subtask.id}${typeTag} → ${targetFile}`
    this.contextValue = `subtask-${subtask.status}`
    
    const statusIcon = STATUS_ICONS[subtask.status] || 'circle-outline'
    this.iconPath = new vscode.ThemeIcon(statusIcon)
    
    const targetFilePath = path.join(subtaskPath, subtask.status === 'done' ? 'report.md' : 'spec.md')
    if (fs.existsSync(targetFilePath)) {
      this.command = {
        command: 'vscode.open',
        title: 'Open File',
        arguments: [vscode.Uri.file(targetFilePath)]
      }
    }
    
    this.tooltip = new vscode.MarkdownString()
    this.tooltip.appendMarkdown(`**${subtask.name}**\n\n`)
    this.tooltip.appendMarkdown(`ID: ${subtask.id}\n\n`)
    this.tooltip.appendMarkdown(`Status: ${subtask.status}\n\n`)
    if (subtask.type) {
      this.tooltip.appendMarkdown(`Type: ${subtask.type}\n\n`)
    }
    this.tooltip.appendMarkdown(`Click to open: ${targetFile}.md`)
  }
}

class SessionsGroupItem extends vscode.TreeItem {
  constructor(
    public readonly featureName: string,
    public readonly sessions: SessionInfo[],
    public readonly master?: string
  ) {
    super('Sessions', sessions.length > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None)
    
    this.description = sessions.length > 0 ? `${sessions.length} active` : ''
    this.contextValue = 'sessions-group'
    this.iconPath = new vscode.ThemeIcon('broadcast')
  }
}

class SessionItem extends vscode.TreeItem {
  constructor(
    public readonly featureName: string,
    public readonly session: SessionInfo,
    public readonly isMaster: boolean
  ) {
    const label = session.taskFolder || (isMaster ? 'Master' : `Session ${session.sessionId.slice(4, 12)}`)
    super(label, vscode.TreeItemCollapsibleState.None)
    
    const shortId = session.sessionId.slice(0, 8)
    this.description = isMaster ? `★ ${shortId}` : shortId
    this.contextValue = 'session'
    this.iconPath = new vscode.ThemeIcon(isMaster ? 'star-full' : 'terminal')
    
    this.tooltip = new vscode.MarkdownString()
    this.tooltip.appendMarkdown(`**Session**: ${session.sessionId}\n\n`)
    if (session.taskFolder) {
      this.tooltip.appendMarkdown(`**Task**: ${session.taskFolder}\n\n`)
    }
    this.tooltip.appendMarkdown(`**Started**: ${session.startedAt}\n\n`)
    this.tooltip.appendMarkdown(`**Last Active**: ${session.lastActiveAt}`)
  }
}

export class HiveSidebarProvider implements vscode.TreeDataProvider<SidebarItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<SidebarItem | undefined>()
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event

  constructor(private workspaceRoot: string) {}

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined)
  }

  getTreeItem(element: SidebarItem): vscode.TreeItem {
    return element
  }

  async getChildren(element?: SidebarItem): Promise<SidebarItem[]> {
    if (!element) {
      return this.getStatusGroups()
    }

    if (element instanceof StatusGroupItem) {
      return element.features
    }

    if (element instanceof FeatureItem) {
      return this.getFeatureChildren(element.name)
    }

    if (element instanceof ContextFolderItem) {
      return this.getContextFiles(element.featureName, element.contextPath)
    }

    if (element instanceof TasksGroupItem) {
      return this.getTasks(element.featureName, element.tasks)
    }

    if (element instanceof TaskItem) {
      return this.getTaskFiles(element)
    }

    if (element instanceof SessionsGroupItem) {
      return this.getSessions(element.featureName, element.sessions, element.master)
    }

    return []
  }

  private getStatusGroups(): StatusGroupItem[] {
    const features = this.getAllFeatures()
    
    // Group features by status category
    const inProgress: FeatureItem[] = []
    const pending: FeatureItem[] = []
    const completed: FeatureItem[] = []
    
    for (const feature of features) {
      if (feature.feature.status === 'executing') {
        inProgress.push(feature)
      } else if (feature.feature.status === 'planning' || feature.feature.status === 'approved') {
        pending.push(feature)
      } else if (feature.feature.status === 'completed') {
        completed.push(feature)
      }
    }
    
    const groups: StatusGroupItem[] = []
    
    if (inProgress.length > 0) {
      groups.push(new StatusGroupItem('In Progress', 'in_progress', inProgress, false))
    }
    if (pending.length > 0) {
      groups.push(new StatusGroupItem('Pending', 'pending', pending, false))
    }
    if (completed.length > 0) {
      groups.push(new StatusGroupItem('Completed', 'completed', completed, true))
    }
    
    return groups
  }

  private getAllFeatures(): FeatureItem[] {
    const featuresPath = path.join(this.workspaceRoot, '.hive', 'features')
    if (!fs.existsSync(featuresPath)) return []

    const activeFeature = this.getActiveFeature()
    const features: FeatureItem[] = []

    const dirs = fs.readdirSync(featuresPath, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name)

    for (const name of dirs) {
      const featureJsonPath = path.join(featuresPath, name, 'feature.json')
      if (!fs.existsSync(featureJsonPath)) continue

      const feature: FeatureJson = JSON.parse(fs.readFileSync(featureJsonPath, 'utf-8'))
      const taskStats = this.getTaskStats(name)
      const isActive = name === activeFeature

      features.push(new FeatureItem(name, feature, taskStats, isActive))
    }

    // Sort by active first, then by creation date
    features.sort((a, b) => {
      if (a.isActive) return -1
      if (b.isActive) return 1
      return 0
    })

    return features
  }

  private getFeatureChildren(featureName: string): SidebarItem[] {
    const featurePath = path.join(this.workspaceRoot, '.hive', 'features', featureName)
    const items: SidebarItem[] = []

    const featureJsonPath = path.join(featurePath, 'feature.json')
    const feature: FeatureJson = JSON.parse(fs.readFileSync(featureJsonPath, 'utf-8'))

    const planPath = path.join(featurePath, 'plan.md')
    if (fs.existsSync(planPath)) {
      const commentCount = this.getCommentCount(featureName)
      items.push(new PlanItem(featureName, planPath, feature.status, commentCount))
    }

    const contextPath = path.join(featurePath, 'context')
    const contextFiles = fs.existsSync(contextPath) 
      ? fs.readdirSync(contextPath).filter(f => !f.startsWith('.'))
      : []
    items.push(new ContextFolderItem(featureName, contextPath, contextFiles.length))

    const tasks = this.getTaskList(featureName)
    items.push(new TasksGroupItem(featureName, tasks))

    const sessionsData = this.getSessionsData(featureName)
    items.push(new SessionsGroupItem(featureName, sessionsData.sessions, sessionsData.master))

    return items
  }

  private getContextFiles(featureName: string, contextPath: string): ContextFileItem[] {
    if (!fs.existsSync(contextPath)) return []

    return fs.readdirSync(contextPath)
      .filter(f => !f.startsWith('.'))
      .map(f => new ContextFileItem(f, path.join(contextPath, f)))
  }

  private getTasks(featureName: string, tasks: Array<{ folder: string; status: TaskStatus }>): TaskItem[] {
    const featurePath = path.join(this.workspaceRoot, '.hive', 'features', featureName)
    
    return tasks.map(t => {
      const taskDir = path.join(featurePath, 'tasks', t.folder)
      const specPath = path.join(taskDir, 'spec.md')
      const reportPath = path.join(taskDir, 'report.md')
      const hasSpec = fs.existsSync(specPath)
      const hasReport = fs.existsSync(reportPath)
      
      const subtasks = this.getSubtasksFromFolders(featureName, t.folder)
      const subtaskCount = subtasks.length
      const subtasksDone = subtasks.filter(s => s.status === 'done').length
      
      return new TaskItem(featureName, t.folder, t.status, hasSpec ? specPath : null, hasReport ? reportPath : null, subtaskCount, subtasksDone)
    })
  }

  private getTaskFiles(taskItem: TaskItem): (TaskFileItem | SubtaskItem)[] {
    const items: (TaskFileItem | SubtaskItem)[] = []
    
    if (taskItem.specPath) {
      items.push(new TaskFileItem('spec.md', taskItem.specPath))
    }
    if (taskItem.reportPath) {
      items.push(new TaskFileItem('report.md', taskItem.reportPath))
    }
    
    const subtasks = this.getSubtasksFromFolders(taskItem.featureName, taskItem.folder)
    for (const subtask of subtasks) {
      const subtaskPath = path.join(
        this.workspaceRoot, '.hive', 'features', taskItem.featureName,
        'tasks', taskItem.folder, 'subtasks', subtask.folder
      )
      items.push(new SubtaskItem(taskItem.featureName, taskItem.folder, subtask, subtaskPath))
    }
    
    return items
  }

  private getSubtasksFromFolders(featureName: string, taskFolder: string): Subtask[] {
    const subtasksPath = path.join(
      this.workspaceRoot, '.hive', 'features', featureName, 'tasks', taskFolder, 'subtasks'
    )
    if (!fs.existsSync(subtasksPath)) return []

    const taskOrder = parseInt(taskFolder.split('-')[0], 10)
    const folders = fs.readdirSync(subtasksPath, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name)
      .sort()

    return folders.map(folder => {
      const statusPath = path.join(subtasksPath, folder, 'status.json')
      const subtaskOrder = parseInt(folder.split('-')[0], 10)
      const name = folder.replace(/^\d+-/, '')
      
      let status: any = { status: 'pending' }
      if (fs.existsSync(statusPath)) {
        try {
          status = JSON.parse(fs.readFileSync(statusPath, 'utf-8'))
        } catch {}
      }

      return {
        id: `${taskOrder}.${subtaskOrder}`,
        name,
        folder,
        status: status.status || 'pending',
        type: status.type,
        createdAt: status.createdAt,
        completedAt: status.completedAt,
      }
    })
  }

  private getTaskList(featureName: string): Array<{ folder: string; status: TaskStatus }> {
    const tasksPath = path.join(this.workspaceRoot, '.hive', 'features', featureName, 'tasks')
    if (!fs.existsSync(tasksPath)) return []

    const folders = fs.readdirSync(tasksPath, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name)
      .sort()

    return folders.map(folder => {
      const statusPath = path.join(tasksPath, folder, 'status.json')
      const status: TaskStatus = fs.existsSync(statusPath)
        ? JSON.parse(fs.readFileSync(statusPath, 'utf-8'))
        : { status: 'pending', origin: 'plan' }
      return { folder, status }
    })
  }

  private getTaskStats(featureName: string): { total: number; done: number } {
    const tasks = this.getTaskList(featureName)
    return {
      total: tasks.length,
      done: tasks.filter(t => t.status.status === 'done').length
    }
  }

  private getActiveFeature(): string | null {
    const activePath = path.join(this.workspaceRoot, '.hive', 'active-feature')
    if (!fs.existsSync(activePath)) return null
    return fs.readFileSync(activePath, 'utf-8').trim()
  }

  private getCommentCount(featureName: string): number {
    const commentsPath = path.join(this.workspaceRoot, '.hive', 'features', featureName, 'comments.json')
    if (!fs.existsSync(commentsPath)) return 0
    
    try {
      const data = JSON.parse(fs.readFileSync(commentsPath, 'utf-8'))
      return data.threads?.length || 0
    } catch {
      return 0
    }
  }

  private getSessionsData(featureName: string): SessionsJson {
    const sessionsPath = path.join(this.workspaceRoot, '.hive', 'features', featureName, 'sessions.json')
    if (!fs.existsSync(sessionsPath)) return { sessions: [] }
    
    try {
      return JSON.parse(fs.readFileSync(sessionsPath, 'utf-8'))
    } catch {
      return { sessions: [] }
    }
  }

  private getSessions(featureName: string, sessions: SessionInfo[], master?: string): SessionItem[] {
    return sessions.map(s => new SessionItem(featureName, s, s.sessionId === master))
  }
}
