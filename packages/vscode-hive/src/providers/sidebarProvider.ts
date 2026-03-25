import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { getFeaturePath, listFeatureDirectories } from 'hive-core'
import type { FeatureJson, TaskStatus } from 'hive-core'

type SidebarItem = ActionItem | StatusGroupItem | FeatureItem | OverviewItem | PlanItem | ContextFolderItem | ContextFileItem | TasksGroupItem | TaskItem | TaskFileItem
  | CopilotArtifactsGroupItem | ArtifactCategoryItem | ArtifactFileItem

// Quick action button
class ActionItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly commandId: string,
    iconName: string
  ) {
    super(label, vscode.TreeItemCollapsibleState.None)
    this.contextValue = 'action'
    this.iconPath = new vscode.ThemeIcon(iconName)
    this.command = {
      command: commandId,
      title: label
    }
  }
}

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
    this.description = `${statusLabel} · ${taskStats.done}/${taskStats.total}`
    
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

class OverviewItem extends vscode.TreeItem {
  constructor(
    public readonly featureName: string,
    public readonly overviewPath: string,
    public readonly commentCount: number
  ) {
    super('Overview', vscode.TreeItemCollapsibleState.None)

    this.description = commentCount > 0 ? `${commentCount} comment(s)` : ''
    this.contextValue = 'overview-file'
    this.iconPath = new vscode.ThemeIcon('book')
    this.command = {
      command: 'vscode.open',
      title: 'Open Overview',
      arguments: [vscode.Uri.file(overviewPath)]
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
    public readonly reportPath: string | null
  ) {
    const name = folder.replace(/^\d+-/, '')
    const hasFiles = specPath !== null || reportPath !== null
    super(name, hasFiles ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None)
    this.description = status.summary || ''
    this.contextValue = `task-${status.status}${status.origin === 'manual' ? '-manual' : ''}`
    
    const iconName = STATUS_ICONS[status.status] || 'circle-outline'
    this.iconPath = new vscode.ThemeIcon(iconName)
    
    this.tooltip = new vscode.MarkdownString()
    this.tooltip.appendMarkdown(`**${folder}**\n\n`)
    this.tooltip.appendMarkdown(`Status: ${status.status}\n\n`)
    this.tooltip.appendMarkdown(`Origin: ${status.origin}\n\n`)
    if (status.summary) {
      this.tooltip.appendMarkdown(`Summary: ${status.summary}`)
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

export class CopilotArtifactsGroupItem extends vscode.TreeItem {
  constructor(public readonly workspaceRoot: string) {
    super('Copilot Artifacts', vscode.TreeItemCollapsibleState.Collapsed)
    this.contextValue = 'copilot-artifacts'
    this.iconPath = new vscode.ThemeIcon('github')
  }
}

export class ArtifactFileItem extends vscode.TreeItem {
  constructor(
    label: string,
    public readonly filePath: string,
    iconName: string
  ) {
    super(label, vscode.TreeItemCollapsibleState.None)
    this.iconPath = new vscode.ThemeIcon(iconName)
    this.command = {
      command: 'vscode.open',
      title: 'Open',
      arguments: [vscode.Uri.file(filePath)]
    }
  }
}

export class ArtifactCategoryItem extends vscode.TreeItem {
  constructor(
    label: string,
    public readonly files: ArtifactFileItem[],
    iconName: string
  ) {
    super(label, files.length > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None)
    this.description = `${files.length}`
    this.iconPath = new vscode.ThemeIcon(iconName)
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
      const items: SidebarItem[] = [
        new ActionItem('Init Skills', 'hive.initNest', 'symbol-misc')
      ]
      const githubDir = path.join(this.workspaceRoot, '.github')
      if (fs.existsSync(githubDir)) {
        items.push(new CopilotArtifactsGroupItem(this.workspaceRoot))
      }
      const statusGroups = await this.getStatusGroups()
      return [...items, ...statusGroups]
    }

    if (element instanceof ActionItem) {
      return []
    }

    if (element instanceof StatusGroupItem) {
      return element.features
    }

    if (element instanceof FeatureItem) {
      return this.getFeatureChildren(element.name)
    }

    if (element instanceof CopilotArtifactsGroupItem) {
      return this.getCopilotArtifactCategories(element.workspaceRoot)
    }

    if (element instanceof ArtifactCategoryItem) {
      return element.files
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
    const activeFeature = this.getActiveFeature()
    const features: FeatureItem[] = []

    const dirs = listFeatureDirectories(this.workspaceRoot)

    for (const dir of dirs) {
      const featureJsonPath = path.join(getFeaturePath(this.workspaceRoot, dir.logicalName), 'feature.json')
      if (!fs.existsSync(featureJsonPath)) continue

      const feature: FeatureJson = JSON.parse(fs.readFileSync(featureJsonPath, 'utf-8'))
      const taskStats = this.getTaskStats(dir.logicalName)
      const isActive = dir.logicalName === activeFeature

      features.push(new FeatureItem(dir.logicalName, feature, taskStats, isActive))
    }

    // Sort by active first, then by deterministic logical name
    features.sort((a, b) => {
      if (a.isActive && !b.isActive) return -1
      if (!a.isActive && b.isActive) return 1
      return a.name.localeCompare(b.name)
    })

    return features
  }

  private getFeatureChildren(featureName: string): SidebarItem[] {
    const featurePath = getFeaturePath(this.workspaceRoot, featureName)
    const items: SidebarItem[] = []

    const featureJsonPath = path.join(featurePath, 'feature.json')
    const feature: FeatureJson = JSON.parse(fs.readFileSync(featureJsonPath, 'utf-8'))

    const planPath = path.join(featurePath, 'plan.md')
    if (fs.existsSync(planPath)) {
      const commentCount = this.getCommentCount(featureName, 'plan')
      items.push(new PlanItem(featureName, planPath, feature.status, commentCount))
    }

    const contextPath = path.join(featurePath, 'context')
    const contextFiles = fs.existsSync(contextPath)
      ? fs.readdirSync(contextPath).filter(f => !f.startsWith('.') && f !== 'overview.md')
      : []

    const overviewPath = path.join(contextPath, 'overview.md')
    if (fs.existsSync(overviewPath)) {
      const commentCount = this.getCommentCount(featureName, 'overview')
      items.push(new OverviewItem(featureName, overviewPath, commentCount))
    }

    items.push(new ContextFolderItem(featureName, contextPath, contextFiles.length))

    const tasks = this.getTaskList(featureName)
    items.push(new TasksGroupItem(featureName, tasks))

    return items
  }

  private getCopilotArtifactCategories(workspaceRoot: string): SidebarItem[] {
    const githubRoot = path.join(workspaceRoot, '.github')
    const agentsDir = path.join(githubRoot, 'agents')
    const skillsDir = path.join(githubRoot, 'skills')
    const hooksDir = path.join(githubRoot, 'hooks')
    const instructionsDir = path.join(githubRoot, 'instructions')
    const pluginPath = path.join(workspaceRoot, 'plugin.json')

    const categories: SidebarItem[] = [
      new ArtifactCategoryItem(
        'Agents',
        this.getArtifactFiles(agentsDir, file => file.endsWith('.agent.md'), 'person'),
        'person'
      ),
      new ArtifactCategoryItem(
        'Skills',
        this.getArtifactFiles(skillsDir, file => file === 'SKILL.md', 'book', true),
        'book'
      ),
      new ArtifactCategoryItem(
        'Hooks',
        this.getArtifactFiles(hooksDir, file => file.endsWith('.json'), 'zap'),
        'zap'
      ),
      new ArtifactCategoryItem(
        'Instructions',
        this.getArtifactFiles(instructionsDir, file => file.endsWith('.instructions.md'), 'note'),
        'note'
      )
    ]

    if (fs.existsSync(pluginPath)) {
      categories.push(new ArtifactFileItem('Plugin Manifest', pluginPath, 'package'))
    }

    return categories
  }

  private getArtifactFiles(
    basePath: string,
    matches: (filename: string) => boolean,
    iconName: string,
    nestedSkillDirs: boolean = false
  ): ArtifactFileItem[] {
    if (!fs.existsSync(basePath)) return []

    if (nestedSkillDirs) {
      return fs.readdirSync(basePath, { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .map(entry => path.join(basePath, entry.name, 'SKILL.md'))
        .filter(filePath => fs.existsSync(filePath))
        .map(filePath => new ArtifactFileItem(path.basename(path.dirname(filePath)), filePath, iconName))
        .sort((a, b) => String(a.label).localeCompare(String(b.label)))
    }

    return fs.readdirSync(basePath, { withFileTypes: true })
      .filter(entry => entry.isFile() && matches(entry.name))
      .map(entry => new ArtifactFileItem(entry.name, path.join(basePath, entry.name), iconName))
      .sort((a, b) => String(a.label).localeCompare(String(b.label)))
  }

  private getContextFiles(featureName: string, contextPath: string): ContextFileItem[] {
    if (!fs.existsSync(contextPath)) return []

    return fs.readdirSync(contextPath)
      .filter(f => !f.startsWith('.') && f !== 'overview.md')
      .map(f => new ContextFileItem(f, path.join(contextPath, f)))
  }

  private getTasks(featureName: string, tasks: Array<{ folder: string; status: TaskStatus }>): TaskItem[] {
    const featurePath = getFeaturePath(this.workspaceRoot, featureName)
    
    return tasks.map(t => {
      const taskDir = path.join(featurePath, 'tasks', t.folder)
      const specPath = path.join(taskDir, 'spec.md')
      const reportPath = path.join(taskDir, 'report.md')
      const hasSpec = fs.existsSync(specPath)
      const hasReport = fs.existsSync(reportPath)
      
      return new TaskItem(featureName, t.folder, t.status, hasSpec ? specPath : null, hasReport ? reportPath : null)
    })
  }

  private getTaskFiles(taskItem: TaskItem): TaskFileItem[] {
    const items: TaskFileItem[] = []
    
    if (taskItem.specPath) {
      items.push(new TaskFileItem('spec.md', taskItem.specPath))
    }
    if (taskItem.reportPath) {
      items.push(new TaskFileItem('report.md', taskItem.reportPath))
    }
    
    return items
  }

  private getTaskList(featureName: string): Array<{ folder: string; status: TaskStatus }> {
    const tasksPath = path.join(getFeaturePath(this.workspaceRoot, featureName), 'tasks')
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
    const configuredActive = fs.existsSync(activePath)
      ? fs.readFileSync(activePath, 'utf-8').trim()
      : null

    if (configuredActive) {
      const feature = this.readFeature(configuredActive)
      if (feature && feature.status !== 'completed') {
        return configuredActive
      }
    }

    const available = listFeatureDirectories(this.workspaceRoot)
      .map(entry => entry.logicalName)
      .filter(name => {
        const feature = this.readFeature(name)
        return feature !== null && feature.status !== 'completed'
      })
      .sort((a, b) => a.localeCompare(b))

    return available[0] ?? null
  }

  private readFeature(featureName: string): FeatureJson | null {
    const featureJsonPath = path.join(getFeaturePath(this.workspaceRoot, featureName), 'feature.json')
    if (!fs.existsSync(featureJsonPath)) return null

    return JSON.parse(fs.readFileSync(featureJsonPath, 'utf-8'))
  }

  private getCommentCount(featureName: string, document: 'plan' | 'overview'): number {
    const featurePath = getFeaturePath(this.workspaceRoot, featureName)
    const commentsPath = document === 'plan'
      ? this.firstExistingPath([
          path.join(featurePath, 'comments', 'plan.json'),
          path.join(featurePath, 'comments.json')
        ])
      : path.join(featurePath, 'comments', 'overview.json')

    if (!commentsPath || !fs.existsSync(commentsPath)) return 0

    try {
      const data = JSON.parse(fs.readFileSync(commentsPath, 'utf-8'))
      return data.threads?.length || 0
    } catch {
      return 0
    }
  }

  private firstExistingPath(paths: string[]): string | null {
    return paths.find(candidate => fs.existsSync(candidate)) ?? null
  }
}
