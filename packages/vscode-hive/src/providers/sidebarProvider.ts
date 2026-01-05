import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { HiveService } from '../services/hiveService'
import { Feature, Step } from '../types'

type FeatureStatus = 'in_progress' | 'completed' | 'pending'

type HiveItem = FeatureItem | FolderItem | FileItem | ExecutionItem | StepItem | SpecFileItem | ReportFileItem | DiffFileItem | SessionTreeItem | FeatureStatusGroupItem | DecisionItem

function classifyFeatureStatus(feature: Feature): FeatureStatus {
  if (feature.status === 'completed' || feature.status === 'archived') return 'completed'
  if (feature.stepsCount === 0) return 'pending'
  if (feature.doneCount === 0) return 'pending'
  if (feature.doneCount === feature.stepsCount) return 'completed'
  return 'in_progress'
}

class FeatureStatusGroupItem extends vscode.TreeItem {
  constructor(
    public readonly status: FeatureStatus,
    public readonly features: Feature[]
  ) {
    const labels: Record<FeatureStatus, string> = { completed: 'COMPLETED', in_progress: 'IN-PROGRESS', pending: 'PENDING' }
    const icons: Record<FeatureStatus, string> = { completed: 'pass-filled', in_progress: 'sync~spin', pending: 'circle-outline' }
    super(labels[status], features.length > 0 ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None)
    this.contextValue = 'featureStatusGroup'
    this.iconPath = new vscode.ThemeIcon(icons[status])
    this.description = `${features.length}`
  }
}

class FeatureItem extends vscode.TreeItem {
  public readonly featureName: string
  public readonly isCompleted: boolean

  constructor(public readonly feature: Feature) {
    super(feature.name, vscode.TreeItemCollapsibleState.Expanded)
    this.featureName = feature.name
    this.isCompleted = feature.status === 'completed' || feature.status === 'archived'
    
    if (this.isCompleted && feature.completedAt) {
      const date = new Date(feature.completedAt).toLocaleDateString()
      this.description = `✓ ${date}`
    } else {
      this.description = `${feature.progress}% (${feature.doneCount}/${feature.stepsCount})`
    }
    
    this.contextValue = this.isCompleted ? 'featureCompleted' : 'feature'
    this.iconPath = new vscode.ThemeIcon(this.isCompleted ? 'pass-filled' : 'package')
    this.command = {
      command: 'hive.showFeature',
      title: 'Show Feature Details',
      arguments: [feature.name]
    }
  }
}

class FolderItem extends vscode.TreeItem {
  constructor(
    label: string,
    public readonly featureName: string,
    public readonly folder: 'requirements' | 'context',
    icon: string,
    hasChildren: boolean
  ) {
    super(label, hasChildren ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None)
    this.contextValue = 'folder'
    this.iconPath = new vscode.ThemeIcon(icon)
  }
}

class FileItem extends vscode.TreeItem {
  constructor(
    public readonly filename: string,
    public readonly featureName: string,
    public readonly folder: 'requirements' | 'context',
    public readonly filePath: string
  ) {
    super(filename, vscode.TreeItemCollapsibleState.None)
    this.contextValue = 'file'
    this.iconPath = new vscode.ThemeIcon(filename.endsWith('.md') ? 'markdown' : 'file')
    this.command = {
      command: 'vscode.open',
      title: 'Open File',
      arguments: [vscode.Uri.file(filePath)]
    }
    this.resourceUri = vscode.Uri.file(filePath)
  }
}

class ExecutionItem extends vscode.TreeItem {
  constructor(public readonly feature: Feature) {
    super('Execution', vscode.TreeItemCollapsibleState.Expanded)
    this.contextValue = 'execution'
    this.iconPath = new vscode.ThemeIcon('run-all')
  }
}

class StepItem extends vscode.TreeItem {
  private static statusIcons: Record<string, string> = {
    done: 'pass',
    in_progress: 'sync~spin',
    pending: 'circle-outline',
    blocked: 'error'
  }

  public readonly stepName: string
  public readonly stepFolder: string
  public readonly sessionId?: string
  public readonly canRevert: boolean

  constructor(
    public readonly featureName: string,
    public readonly step: Step,
    hasSpecFiles: boolean
  ) {
    const canRevert = step.status === 'done' && step.execution?.canRevert === true
    const label = `${String(step.order).padStart(2, '0')}-${step.name}${canRevert ? ' ⟲' : ''}`
    
    super(
      label,
      (hasSpecFiles || step.sessionId || step.status === 'done') ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None
    )
    this.stepName = step.name
    this.stepFolder = step.folderPath
    this.sessionId = step.sessionId
    this.canRevert = canRevert
    this.contextValue = canRevert ? 'stepWithRevert' : 'step'
    this.iconPath = new vscode.ThemeIcon(StepItem.statusIcons[step.status] || 'circle-outline')
    
    if (step.summary) {
      this.description = step.summary
    }

    if (step.sessionId) {
      this.tooltip = `Session: ${step.sessionId}`
    } else if (canRevert) {
      this.tooltip = 'Can be reverted'
    }
  }
}

class SpecFileItem extends vscode.TreeItem {
  constructor(
    public readonly filename: string,
    public readonly featureName: string,
    public readonly stepFolder: string,
    public readonly filePath: string
  ) {
    super(filename, vscode.TreeItemCollapsibleState.None)
    this.contextValue = 'specFile'
    this.iconPath = new vscode.ThemeIcon('markdown')
    this.command = {
      command: 'vscode.open',
      title: 'Open Spec',
      arguments: [vscode.Uri.file(filePath)]
    }
    this.resourceUri = vscode.Uri.file(filePath)
  }
}

class ReportFileItem extends vscode.TreeItem {
  constructor(
    public readonly featureName: string,
    public readonly stepFolder: string,
    public readonly filePath: string
  ) {
    super('report.json', vscode.TreeItemCollapsibleState.None)
    this.contextValue = 'reportFile'
    this.iconPath = new vscode.ThemeIcon('file-json')
    this.command = {
      command: 'vscode.open',
      title: 'Open Report',
      arguments: [vscode.Uri.file(filePath)]
    }
    this.resourceUri = vscode.Uri.file(filePath)
  }
}

class DiffFileItem extends vscode.TreeItem {
  constructor(
    public readonly featureName: string,
    public readonly stepFolder: string,
    public readonly filePath: string
  ) {
    super('output.diff', vscode.TreeItemCollapsibleState.None)
    this.contextValue = 'diffFile'
    this.iconPath = new vscode.ThemeIcon('file-code')
    this.command = {
      command: 'hive.viewDiff',
      title: 'View Diff',
      arguments: [vscode.Uri.file(filePath)]
    }
    this.resourceUri = vscode.Uri.file(filePath)
  }
}

class SessionTreeItem extends vscode.TreeItem {
  constructor(
    public readonly featureName: string,
    public readonly stepFolder: string,
    public readonly session: { id: string; title?: string; isParent: boolean; summary?: string }
  ) {
    super(session.title || session.id, vscode.TreeItemCollapsibleState.None)
    this.contextValue = 'session'
    this.iconPath = this.getIcon()
    this.description = session.isParent ? 'main' : this.parseAgentType()
    if (session.summary) {
      this.tooltip = session.summary
    }
    this.command = {
      command: 'hive.openSession',
      title: 'Open in OpenCode',
      arguments: [{ session }]
    }
  }

  private parseAgentType(): string | undefined {
    const match = this.session.title?.match(/@(\w+)\s+subagent/)
    return match?.[1]
  }

  private getIcon(): vscode.ThemeIcon {
    if (this.session.isParent) return new vscode.ThemeIcon('circle-filled')
    const agent = this.parseAgentType()
    switch (agent) {
      case 'explore': return new vscode.ThemeIcon('search')
      case 'librarian': return new vscode.ThemeIcon('book')
      case 'general': return new vscode.ThemeIcon('hubot')
      case 'oracle': return new vscode.ThemeIcon('lightbulb')
      default: return new vscode.ThemeIcon('terminal')
    }
  }
}

class DecisionItem extends vscode.TreeItem {
  constructor(
    public readonly featureName: string,
    public readonly decision: { filename: string; title: string; filePath: string }
  ) {
    super(decision.title, vscode.TreeItemCollapsibleState.None)
    this.contextValue = 'decision'
    this.iconPath = new vscode.ThemeIcon('lightbulb')
    this.description = decision.filename
    this.command = {
      command: 'vscode.open',
      title: 'Open Decision',
      arguments: [vscode.Uri.file(decision.filePath)]
    }
    this.resourceUri = vscode.Uri.file(decision.filePath)
  }
}

export class HiveSidebarProvider implements vscode.TreeDataProvider<HiveItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<HiveItem | undefined>()
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event

  constructor(private hiveService: HiveService) {}

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined)
  }

  getTreeItem(element: HiveItem): vscode.TreeItem {
    return element
  }

  async getChildren(element?: HiveItem): Promise<HiveItem[]> {
    if (!element) {
      const features = this.hiveService.getFeatures()
      const grouped: Record<FeatureStatus, Feature[]> = { in_progress: [], pending: [], completed: [] }
      
      for (const f of features) {
        grouped[classifyFeatureStatus(f)].push(f)
      }
      
      // Sort by completion % (descending for in_progress, ascending for pending)
      grouped.in_progress.sort((a, b) => b.progress - a.progress)
      grouped.pending.sort((a, b) => a.progress - b.progress)
      grouped.completed.sort((a, b) => b.progress - a.progress)
      
      const result: HiveItem[] = []
      // Order: IN-PROGRESS, PENDING, COMPLETED
      if (grouped.in_progress.length > 0) result.push(new FeatureStatusGroupItem('in_progress', grouped.in_progress))
      if (grouped.pending.length > 0) result.push(new FeatureStatusGroupItem('pending', grouped.pending))
      if (grouped.completed.length > 0) result.push(new FeatureStatusGroupItem('completed', grouped.completed))
      
      return result
    }

    if (element instanceof FeatureStatusGroupItem) {
      return element.features.map(f => new FeatureItem(f))
    }

    if (element instanceof FeatureItem) {
      const requirementsFiles = this.hiveService.getFilesInFolder(element.feature.name, 'requirements')
      const contextFiles = this.hiveService.getFilesInFolder(element.feature.name, 'context')
      return [
        new FolderItem('Requirements', element.feature.name, 'requirements', 'question', requirementsFiles.length > 0),
        new FolderItem('Context', element.feature.name, 'context', 'lightbulb', contextFiles.length > 0),
        new ExecutionItem(element.feature)
      ]
    }

    if (element instanceof FolderItem) {
      if (element.folder === 'context') {
        const decisions = this.hiveService.getDecisions(element.featureName)
        return decisions.map(d => new DecisionItem(element.featureName, d))
      }
      const files = this.hiveService.getFilesInFolder(element.featureName, element.folder)
      return files.map(f => new FileItem(
        f,
        element.featureName,
        element.folder,
        this.hiveService.getFilePath(element.featureName, element.folder, f)
      ))
    }

    if (element instanceof ExecutionItem) {
      return element.feature.steps.map(s => new StepItem(
        element.feature.name, 
        s, 
        s.specFiles.length > 0
      ))
    }

    if (element instanceof StepItem) {
      const step = this.hiveService.getFeature(element.featureName).steps.find(s => s.folderPath === element.stepFolder)
      if (!step) return []

      const children: HiveItem[] = []
      const stepPath = path.join(this.hiveService['basePath'], 'features', element.featureName, 'execution', element.stepFolder)

      children.push(...step.specFiles.map(f => new SpecFileItem(
        f,
        element.featureName,
        element.stepFolder,
        this.hiveService.getStepFilePath(element.featureName, element.stepFolder, f)
      )))

      const reportPath = path.join(stepPath, 'report.json')
      if (fs.existsSync(reportPath)) {
        children.push(new ReportFileItem(
          element.featureName,
          element.stepFolder,
          reportPath
        ))
      }

      const diffPath = path.join(stepPath, 'output.diff')
      if (fs.existsSync(diffPath)) {
        children.push(new DiffFileItem(
          element.featureName,
          element.stepFolder,
          diffPath
        ))
      }

      if (element.sessionId) {
        const sessions = await this.hiveService.getStepSessions(element.featureName, element.stepFolder)
        children.push(...sessions.map(s => new SessionTreeItem(element.featureName, element.stepFolder, s)))
      }

      return children
    }

    return []
  }
}
