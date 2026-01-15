import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { FeatureService, PlanService, TaskService, WorktreeService, AskService } from 'hive-core'
import { HiveWatcher, Launcher } from './services'
import { HiveSidebarProvider, PlanCommentController } from './providers'
import { HiveQueenPanel } from './panels/HiveQueenPanel'
import {
  registerAllTools,
  getFeatureTools,
  getPlanTools,
  getTaskTools,
  getSubtaskTools,
  getExecTools,
  getMergeTools,
  getContextTools,
  getAskTools,
  getSessionTools
} from './tools'
import { initNest } from './commands/initNest'

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
  private statusBarItem: vscode.StatusBarItem | null = null

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

    registerAllTools(this.context, [
      ...getFeatureTools(workspaceRoot),
      ...getPlanTools(workspaceRoot),
      ...getTaskTools(workspaceRoot),
      ...getSubtaskTools(workspaceRoot),
      ...getExecTools(workspaceRoot),
      ...getMergeTools(workspaceRoot),
      ...getContextTools(workspaceRoot),
      ...getAskTools(),
      ...getSessionTools()
    ])

    this.hiveWatcher = new HiveWatcher(workspaceRoot, () => {
      this.sidebarProvider?.refresh()
      this.updateStatusBar(workspaceRoot)
    })
    this.context.subscriptions.push({ dispose: () => this.hiveWatcher?.dispose() })

    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100)
    this.statusBarItem.command = 'hive.openQueenPanel'
    this.context.subscriptions.push(this.statusBarItem)
    this.updateStatusBar(workspaceRoot)

    if (this.creationWatcher) {
      this.creationWatcher.dispose()
      this.creationWatcher = null
    }
  }

  private initializeWithoutHive(): void {
    this.creationWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(this.workspaceFolder, '.hive/**')
    )

    const onHiveCreated = () => {
      const newRoot = findHiveRoot(this.workspaceFolder)
      if (newRoot && !this.initialized) {
        this.workspaceRoot = newRoot
        this.initializeWithHive(newRoot)
        vscode.window.showInformationMessage('Hive: .hive directory detected, extension activated')
      }
    }

    this.creationWatcher.onDidCreate(onHiveCreated)
    this.context.subscriptions.push(this.creationWatcher)
  }

  private updateStatusBar(workspaceRoot: string): void {
    if (!this.statusBarItem) return
    
    const askService = new AskService(workspaceRoot)
    const featureService = new FeatureService(workspaceRoot)
    const activeFeature = featureService.getActive()
    
    if (!activeFeature) {
      this.statusBarItem.hide()
      return
    }
    
    const pendingAsks = askService.listPending(activeFeature.name)
    const askCount = pendingAsks.length
    
    this.statusBarItem.text = askCount > 0 ? `$(bee) ${askCount}` : '$(bee)'
    this.statusBarItem.tooltip = askCount > 0 
      ? `Hive: ${askCount} pending question(s) - Click to open Queen Panel`
      : `Hive: ${activeFeature.name} - Click to open Queen Panel`
    this.statusBarItem.show()
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
          const planService = new PlanService(this.workspaceRoot)
          const comments = planService.getComments(item.featureName)
          
          if (comments.length > 0) {
            vscode.window.showWarningMessage(`Hive: Cannot approve - ${comments.length} unresolved comment(s). Address them first.`)
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
        const featureMatch = filePath.match(/\.hive\/features\/([^/]+)\/plan\.md$/)
        if (!featureMatch) {
          vscode.window.showErrorMessage('Not a plan.md file')
          return
        }

        const featureName = featureMatch[1]
        const commentsPath = path.join(this.workspaceRoot, '.hive', 'features', featureName, 'comments.json')

        let comments: Array<{ body: string; line?: number }> = []

        try {
          const commentsData = JSON.parse(fs.readFileSync(commentsPath, 'utf-8'))
          comments = commentsData.threads || []
        } catch (error) {
          // No comments file is fine
        }

        const hasComments = comments.length > 0
        const inputPrompt = hasComments 
          ? `${comments.length} comment(s) found. Add feedback or leave empty to submit comments only`
          : 'Enter your review feedback (or leave empty to approve)'
        
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
            ? `Review comments:\n${allComments}`
            : `Review comments:\n${allComments}\n\nAdditional feedback: ${userInput}`
        } else {
          feedback = userInput === ''
            ? 'Plan approved'
            : `Review feedback: ${userInput}`
        }

        // Show the feedback and guide user to Copilot Chat
        vscode.window.showInformationMessage(
          `Hive: ${hasComments ? 'Comments submitted' : 'Review submitted'}. Use @Hive in Copilot Chat to continue.`
        )
        
        // Copy feedback to clipboard for easy pasting
        await vscode.env.clipboard.writeText(`@Hive ${feedback}`)
        vscode.window.showInformationMessage('Hive: Feedback copied to clipboard. Paste in Copilot Chat.')
      }),

      vscode.commands.registerCommand('hive.showAsk', (ask: { id: string; question: string; feature: string; timestamp: string }) => {
        if (!this.workspaceRoot) return
        
        const askService = new AskService(this.workspaceRoot)
        
        vscode.window.showInformationMessage(
          `Agent Question: ${ask.question}`,
          'Answer'
        ).then(async (selection) => {
          if (selection === 'Answer') {
            const answer = await vscode.window.showInputBox({
              prompt: ask.question,
              placeHolder: 'Enter your answer...'
            })
            if (answer) {
              askService.submitAnswer(ask.feature, ask.id, answer)
              vscode.window.showInformationMessage('Hive: Answer submitted to agent.')
            }
          }
        })
      }),

      vscode.commands.registerCommand('hive.openQueenPanel', async () => {
        if (!this.workspaceRoot) {
          vscode.window.showWarningMessage('Hive: No .hive directory found.')
          return
        }
        
        const featureService = new FeatureService(this.workspaceRoot)
        const planService = new PlanService(this.workspaceRoot)
        const activeFeature = featureService.getActive()
        
        if (!activeFeature) {
          vscode.window.showWarningMessage('Hive: No active feature. Create one first.')
          return
        }
        
        const plan = planService.read(activeFeature.name)
        const comments = planService.getComments(activeFeature.name)
        const mode = activeFeature.status === 'planning' ? 'planning' : 'execution'
        
        await HiveQueenPanel.showWithOptions(this.context.extensionUri, {
          plan: plan || '',
          title: `Hive Queen: ${activeFeature.name}`,
          mode,
          featureName: activeFeature.name,
          featurePath: path.join(this.workspaceRoot, '.hive', 'features', activeFeature.name),
          projectRoot: this.workspaceRoot,
          existingComments: comments
        })
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
