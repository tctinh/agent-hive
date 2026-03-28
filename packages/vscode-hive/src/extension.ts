import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { FeatureService, PlanService, TaskService, WorktreeService } from 'hive-core'
import { HiveWatcher, Launcher } from './services'
import { HiveSidebarProvider, PlanCommentController } from './providers'
import {
  registerAllTools,
  getFeatureTools,
  getPlanTools,
  getTaskTools,
  getExecTools,
  getMergeTools,
  getContextTools,
  getStatusTools,
  getAgentsMdTools,
  getSkillTools
} from './tools'
import { initNest } from './commands/initNest'
import { regenerateAgents } from './commands/regenerateAgents'

type ReviewDocument = 'plan' | 'overview'

function getReviewTarget(workspaceRoot: string, filePath: string): { featureName: string; document: ReviewDocument } | null {
  const normalizedWorkspace = workspaceRoot.replace(/\\/g, '/').replace(/\/+$/, '')
  const normalizedPath = filePath.replace(/\\/g, '/')
  const compareWorkspace = process.platform === 'win32' ? normalizedWorkspace.toLowerCase() : normalizedWorkspace
  const comparePath = process.platform === 'win32' ? normalizedPath.toLowerCase() : normalizedPath

  if (!comparePath.startsWith(`${compareWorkspace}/`)) {
    return null
  }

  const planMatch = normalizedPath.match(/\.hive\/features\/([^/]+)\/plan\.md$/)
  if (planMatch) {
    return { featureName: planMatch[1], document: 'plan' }
  }

  const overviewMatch = normalizedPath.match(/\.hive\/features\/([^/]+)\/context\/overview\.md$/)
  if (overviewMatch) {
    return { featureName: overviewMatch[1], document: 'overview' }
  }

  return null
}

function getReviewCommentsPath(workspaceRoot: string, featureName: string, document: ReviewDocument): string {
  if (document === 'plan') {
    const canonicalPath = path.join(workspaceRoot, '.hive', 'features', featureName, 'comments', 'plan.json')
    const legacyPath = path.join(workspaceRoot, '.hive', 'features', featureName, 'comments.json')
    return fs.existsSync(canonicalPath) ? canonicalPath : fs.existsSync(legacyPath) ? legacyPath : canonicalPath
  }

  return path.join(workspaceRoot, '.hive', 'features', featureName, 'comments', 'overview.json')
}

function findHiveRoot(startPath: string): string | null {
  let current = startPath
  while (current !== path.dirname(current)) {
    if (fs.existsSync(path.join(current, '.hive'))) {
      return current
    }
    current = path.dirname(current)
  }
  return null
}

class HiveExtension {
  private sidebarProvider: HiveSidebarProvider | null = null
  private launcher: Launcher | null = null
  private commentController: PlanCommentController | null = null
  private hiveWatcher: HiveWatcher | null = null
  private creationWatcher: vscode.FileSystemWatcher | null = null
  private workspaceRoot: string | null = null
  private initialized = false

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly workspaceFolder: string
  ) {}

  initialize(): void {
    this.workspaceRoot = findHiveRoot(this.workspaceFolder)
    
    if (this.workspaceRoot) {
      this.initializeWithHive(this.workspaceRoot)
    } else {
      this.initializeWithoutHive()
    }
  }

  private initializeWithHive(workspaceRoot: string): void {
    if (this.initialized) return
    this.initialized = true

    this.sidebarProvider = new HiveSidebarProvider(workspaceRoot)
    this.launcher = new Launcher(workspaceRoot)
    this.commentController = new PlanCommentController(workspaceRoot)

    vscode.window.registerTreeDataProvider('hive.features', this.sidebarProvider)
    this.commentController.registerCommands(this.context)
    vscode.commands.executeCommand('setContext', 'hive.hasHiveRoot', true)

    registerAllTools(this.context, [
      ...getFeatureTools(workspaceRoot),
      ...getPlanTools(workspaceRoot),
      ...getTaskTools(workspaceRoot),
      ...getExecTools(workspaceRoot),
      ...getMergeTools(workspaceRoot),
      ...getContextTools(workspaceRoot),
      ...getStatusTools(workspaceRoot),
      ...getAgentsMdTools(workspaceRoot),
      ...getSkillTools(workspaceRoot)
    ])

    this.hiveWatcher = new HiveWatcher(workspaceRoot, () => {
      this.sidebarProvider?.refresh()
    })
    this.context.subscriptions.push({ dispose: () => this.hiveWatcher?.dispose() })

    if (this.creationWatcher) {
      this.creationWatcher.dispose()
      this.creationWatcher = null
    }
  }

  private initializeWithoutHive(): void {
    vscode.commands.executeCommand('setContext', 'hive.hasHiveRoot', false)
    
    this.creationWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(this.workspaceFolder, '.hive/**')
    )

    const onHiveCreated = () => {
      const newRoot = findHiveRoot(this.workspaceFolder)
        if (newRoot && !this.initialized) {
          this.workspaceRoot = newRoot
          this.initializeWithHive(newRoot)
        }
      }

    this.creationWatcher.onDidCreate(onHiveCreated)
    this.context.subscriptions.push(this.creationWatcher)
  }

  registerCommands(): void {
    const workspaceFolder = this.workspaceFolder

    this.context.subscriptions.push(
      vscode.commands.registerCommand('hive.initNest', async () => {
        await initNest(workspaceFolder)
        const newRoot = findHiveRoot(workspaceFolder)
        if (newRoot && !this.initialized) {
          this.workspaceRoot = newRoot
          this.initializeWithHive(newRoot)
        }
      }),

      vscode.commands.registerCommand('hive.refresh', () => {
        if (!this.initialized) {
          const newRoot = findHiveRoot(workspaceFolder)
          if (newRoot) {
            this.workspaceRoot = newRoot
            this.initializeWithHive(newRoot)
          } else {
            vscode.window.showWarningMessage('Hive: No .hive directory found. Use @Hive in Copilot Chat to create a feature.')
            return
          }
        }
        this.sidebarProvider?.refresh()
      }),

      vscode.commands.registerCommand('hive.regenerateAgents', async () => {
        if (this.workspaceRoot) {
          await regenerateAgents(this.workspaceRoot)
        }
      }),

      vscode.commands.registerCommand('hive.newFeature', async () => {
        const name = await vscode.window.showInputBox({
          prompt: 'Feature name',
          placeHolder: 'my-feature'
        })
        if (name && this.workspaceRoot) {
          const featureService = new FeatureService(this.workspaceRoot)
          try {
            featureService.create(name)
            this.sidebarProvider?.refresh()
            vscode.window.showInformationMessage(`Hive: Feature "${name}" created. Use @Hive in Copilot Chat to write a plan.`)
          } catch (error) {
            vscode.window.showErrorMessage(`Hive: Failed to create feature - ${error}`)
          }
        } else if (name) {
          // No workspace root, create .hive directory first
          const hiveDir = path.join(workspaceFolder, '.hive')
          fs.mkdirSync(hiveDir, { recursive: true })
          this.workspaceRoot = workspaceFolder
          this.initializeWithHive(workspaceFolder)
          const featureService = new FeatureService(workspaceFolder)
          featureService.create(name)
          this.sidebarProvider?.refresh()
          vscode.window.showInformationMessage(`Hive: Feature "${name}" created. Use @Hive in Copilot Chat to write a plan.`)
        }
      }),

      vscode.commands.registerCommand('hive.openFeature', (featureName: string) => {
        this.launcher?.openFeature(featureName)
      }),

      vscode.commands.registerCommand('hive.openTask', (item: { featureName?: string; folder?: string }) => {
        if (item?.featureName && item?.folder) {
          this.launcher?.openTask(item.featureName, item.folder)
        }
      }),

      vscode.commands.registerCommand('hive.openFile', (filePath: string) => {
        if (filePath) {
          this.launcher?.openFile(filePath)
        }
      }),

      vscode.commands.registerCommand('hive.approvePlan', async (item: { featureName?: string }) => {
        if (item?.featureName && this.workspaceRoot) {
          const featureService = new FeatureService(this.workspaceRoot)
          const planService = new PlanService(this.workspaceRoot)
          const reviewCounts = featureService.getInfo(item.featureName)?.reviewCounts ?? { plan: 0, overview: 0 }
          const unresolvedTotal = reviewCounts.plan + reviewCounts.overview
          
          if (unresolvedTotal > 0) {
            const documents = [
              reviewCounts.plan > 0 ? `plan (${reviewCounts.plan})` : null,
              reviewCounts.overview > 0 ? `overview (${reviewCounts.overview})` : null,
            ].filter(Boolean).join(', ')
            vscode.window.showWarningMessage(`Hive: Cannot approve - ${unresolvedTotal} unresolved review comment(s) remain across ${documents}. Address them first.`)
            return
          }
          
          try {
            planService.approve(item.featureName)
            this.sidebarProvider?.refresh()
            vscode.window.showInformationMessage(`Hive: Plan approved for "${item.featureName}". Use @Hive to sync tasks.`)
          } catch (error) {
            vscode.window.showErrorMessage(`Hive: Failed to approve plan - ${error}`)
          }
        }
      }),

      vscode.commands.registerCommand('hive.syncTasks', async (item: { featureName?: string }) => {
        if (item?.featureName && this.workspaceRoot) {
          const featureService = new FeatureService(this.workspaceRoot)
          const taskService = new TaskService(this.workspaceRoot)
          
          const featureData = featureService.get(item.featureName)
          if (!featureData || featureData.status === 'planning') {
            vscode.window.showWarningMessage('Hive: Plan must be approved before syncing tasks.')
            return
          }
          
          try {
            const result = taskService.sync(item.featureName)
            if (featureData.status === 'approved') {
              featureService.updateStatus(item.featureName, 'executing')
            }
            this.sidebarProvider?.refresh()
            vscode.window.showInformationMessage(`Hive: ${result.created.length} tasks created for "${item.featureName}".`)
          } catch (error) {
            vscode.window.showErrorMessage(`Hive: Failed to sync tasks - ${error}`)
          }
        }
      }),

      vscode.commands.registerCommand('hive.startTask', async (item: { featureName?: string; folder?: string }) => {
        if (item?.featureName && item?.folder && this.workspaceRoot) {
          const worktreeService = new WorktreeService({
            baseDir: this.workspaceRoot,
            hiveDir: path.join(this.workspaceRoot, '.hive'),
          })
          const taskService = new TaskService(this.workspaceRoot)
          
          try {
            const worktree = await worktreeService.create(item.featureName, item.folder)
            taskService.update(item.featureName, item.folder, { status: 'in_progress' })
            this.sidebarProvider?.refresh()
            
            const openWorktree = await vscode.window.showInformationMessage(
              `Hive: Worktree created at ${worktree.path}`,
              'Open in New Window'
            )
            
            if (openWorktree === 'Open in New Window') {
              this.launcher?.openTask(item.featureName, item.folder)
            }
          } catch (error) {
            vscode.window.showErrorMessage(`Hive: Failed to start task - ${error}`)
          }
        }
      }),

      vscode.commands.registerCommand('hive.plan.doneReview', async () => {
        const editor = vscode.window.activeTextEditor
        if (!editor) return

        if (!this.workspaceRoot) {
          vscode.window.showErrorMessage('Hive: No .hive directory found')
          return
        }

        const filePath = editor.document.uri.fsPath
        const target = getReviewTarget(this.workspaceRoot, filePath)
        if (!target) {
          vscode.window.showErrorMessage('Not a reviewable plan.md or context/overview.md file')
          return
        }

        const commentsPath = getReviewCommentsPath(this.workspaceRoot, target.featureName, target.document)

        let comments: Array<{ body: string; line?: number }> = []

        try {
          const commentsData = JSON.parse(fs.readFileSync(commentsPath, 'utf-8'))
          comments = commentsData.threads || []
        } catch (error) {
          // No comments file is fine
        }

        const hasComments = comments.length > 0
        const documentLabel = target.document === 'overview' ? 'Overview' : 'Plan'
        const inputPrompt = hasComments 
          ? `${documentLabel}: ${comments.length} comment(s) found. Add feedback or leave empty to submit comments only`
          : `Enter your ${documentLabel.toLowerCase()} review feedback (or leave empty to approve)`
        
        const userInput = await vscode.window.showInputBox({
          prompt: inputPrompt,
          placeHolder: hasComments ? 'Additional feedback (optional)' : 'e.g., "looks good" to approve, or describe changes needed'
        })
        
        if (userInput === undefined) return

        // Build feedback message for Copilot Chat
        let feedback: string
        if (hasComments) {
          const allComments = comments.map(c => `Line ${c.line}: ${c.body}`).join('\n')
          feedback = userInput === '' 
            ? `${documentLabel} review comments:\n${allComments}`
            : `${documentLabel} review comments:\n${allComments}\n\nAdditional feedback: ${userInput}`
        } else {
          feedback = userInput === ''
            ? `${documentLabel} approved`
            : `${documentLabel} review feedback: ${userInput}`
        }

        // Show the feedback and guide user to Copilot Chat
        vscode.window.showInformationMessage(
          `Hive: ${hasComments ? 'Comments submitted' : 'Review submitted'}. Use @Hive in Copilot Chat to continue.`
        )
        
        // Copy feedback to clipboard for easy pasting
        await vscode.env.clipboard.writeText(`@Hive ${feedback}`)
        vscode.window.showInformationMessage('Hive: Feedback copied to clipboard. Paste in Copilot Chat.')
      })
    )
  }
}

export function activate(context: vscode.ExtensionContext): void {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
  if (!workspaceFolder) return

  const extension = new HiveExtension(context, workspaceFolder)
  extension.registerCommands()
  extension.initialize()
}

export function deactivate(): void {}
