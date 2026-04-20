import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { FeatureService, PlanService, TaskService } from 'hive-core'
import { HiveWatcher, Launcher } from './services'
import { HiveSidebarProvider, PlanCommentController } from './providers'
import { initNest } from './commands/initNest'
import { regenerateAgents } from './commands/regenerateAgents'
import { getAllToolRegistrations } from './tools'

type ReviewDocument = 'plan'

type HiveLanguageModelTool = {
  prepareInvocation?: (
    options: { input: Record<string, unknown> },
    token: vscode.CancellationToken,
  ) => Promise<{
    invocationMessage?: string
    confirmationMessages?: {
      title: string
      message: vscode.MarkdownString
    }
  } | undefined>
  invoke: (
    options: { input: Record<string, unknown> },
    token: vscode.CancellationToken,
  ) => Promise<vscode.LanguageModelToolResult>
}

function createLanguageModelTextResult(content: string): vscode.LanguageModelToolResult {
  return new vscode.LanguageModelToolResult([
    new vscode.LanguageModelTextPart(content),
  ])
}

function registerLanguageModelTools(context: vscode.ExtensionContext, workspaceRoot: string): void {
  if (!vscode.lm?.registerTool) {
    return
  }

  const stableTools = getAllToolRegistrations(workspaceRoot)
    .filter(tool => tool.canBeReferencedInPrompt && tool.toolReferenceName)
    .filter(tool => !tool.name.includes('Status'))

  for (const tool of stableTools) {
    const implementation: HiveLanguageModelTool = {
      prepareInvocation: async (options) => {
        if (!tool.confirmation) {
          return {
            invocationMessage: `Running ${tool.displayName}`,
          }
        }

        return {
          invocationMessage: tool.confirmation.invocationMessage ?? `Running ${tool.displayName}`,
          confirmationMessages: {
            title: tool.confirmation.title,
            message: new vscode.MarkdownString(tool.confirmation.message),
          },
        }
      },
      invoke: async (options, token) => {
        const result = await tool.invoke(options.input, token)
        return createLanguageModelTextResult(result)
      },
    }

    context.subscriptions.push(vscode.lm.registerTool(tool.name, implementation as vscode.LanguageModelTool<Record<string, unknown>>))
  }
}

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

  return null
}

function getReviewCommentsPath(workspaceRoot: string, featureName: string, document: ReviewDocument): string {
  const canonicalPath = path.join(workspaceRoot, '.hive', 'features', featureName, 'comments', `${document}.json`)
  if (fs.existsSync(canonicalPath)) {
    return canonicalPath
  }

  return path.join(workspaceRoot, '.hive', 'features', featureName, 'comments.json')
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

    registerLanguageModelTools(this.context, workspaceRoot)

    this.sidebarProvider = new HiveSidebarProvider(workspaceRoot)
    this.launcher = new Launcher(workspaceRoot)
    this.commentController = new PlanCommentController(workspaceRoot)

    vscode.window.registerTreeDataProvider('hive.features', this.sidebarProvider)
    this.commentController.registerCommands(this.context)
    vscode.commands.executeCommand('setContext', 'hive.hasHiveRoot', true)

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
            vscode.window.showWarningMessage('Hive: No .hive directory found. Initialize a Hive nest to start reviewing and planning features.')
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
            vscode.window.showInformationMessage(`Hive: Feature "${name}" created. Open the plan from the sidebar to continue.`)
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
          vscode.window.showInformationMessage(`Hive: Feature "${name}" created. Open the plan from the sidebar to continue.`)
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
          const reviewCounts = featureService.getInfo(item.featureName)?.reviewCounts ?? { plan: 0 }
          const unresolvedTotal = reviewCounts.plan
          
          if (unresolvedTotal > 0) {
            vscode.window.showWarningMessage(`Hive: Cannot approve - ${unresolvedTotal} unresolved plan review comment(s) remain. Address them first.`)
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
          vscode.window.showErrorMessage('Not a reviewable plan.md file')
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
        const inputPrompt = hasComments 
          ? `Plan: ${comments.length} comment(s) found. Add feedback or leave empty to submit comments only`
          : 'Enter your plan review feedback (or leave empty to approve)'
        
        const userInput = await vscode.window.showInputBox({
          prompt: inputPrompt,
          placeHolder: hasComments ? 'Additional feedback (optional)' : 'e.g., "looks good" to approve, or describe changes needed'
        })
        
        if (userInput === undefined) return

        let feedback: string
        if (hasComments) {
          const allComments = comments.map(c => `Line ${c.line}: ${c.body}`).join('\n')
          feedback = userInput === '' 
            ? `Plan review comments:\n${allComments}`
            : `Plan review comments:\n${allComments}\n\nAdditional feedback: ${userInput}`
        } else {
          feedback = userInput === ''
            ? 'Plan approved'
            : `Plan review feedback: ${userInput}`
        }

        vscode.window.showInformationMessage(
          `Hive: ${hasComments ? 'Comments submitted' : 'Review submitted'}. The review summary has been copied to your clipboard.`
        )
        
        await vscode.env.clipboard.writeText(feedback)
        vscode.window.showInformationMessage('Hive: Feedback copied to clipboard for your next planning step.')
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
