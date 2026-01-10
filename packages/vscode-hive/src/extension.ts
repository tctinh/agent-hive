import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { HiveWatcher, Launcher } from './services'
import { HiveSidebarProvider, PlanCommentController } from './providers'
import {
  registerAllTools,
  getFeatureTools,
  getPlanTools,
  getTaskTools,
  getSubtaskTools,
  getExecTools,
  getMergeTools,
  getContextTools
} from './tools'

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

    registerAllTools(this.context, [
      ...getFeatureTools(workspaceRoot),
      ...getPlanTools(workspaceRoot),
      ...getTaskTools(workspaceRoot),
      ...getSubtaskTools(workspaceRoot),
      ...getExecTools(workspaceRoot),
      ...getMergeTools(workspaceRoot),
      ...getContextTools(workspaceRoot)
      // Session tools removed - GitHub Copilot handles sessions natively
    ])

    this.hiveWatcher = new HiveWatcher(workspaceRoot, () => this.sidebarProvider?.refresh())
    this.context.subscriptions.push({ dispose: () => this.hiveWatcher?.dispose() })

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

  registerCommands(): void {
    const workspaceFolder = this.workspaceFolder

    this.context.subscriptions.push(
      vscode.commands.registerCommand('hive.refresh', () => {
        if (!this.initialized) {
          const newRoot = findHiveRoot(workspaceFolder)
          if (newRoot) {
            this.workspaceRoot = newRoot
            this.initializeWithHive(newRoot)
          } else {
            vscode.window.showWarningMessage('Hive: No .hive directory found. Create a feature with OpenCode first.')
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
        if (name) {
          const terminal = vscode.window.createTerminal('OpenCode - Hive')
          terminal.sendText(`opencode --command "/hive ${name}"`)
          terminal.show()
        }
      }),

      vscode.commands.registerCommand('hive.openFeatureInOpenCode', (featureName: string) => {
        this.launcher?.openFeature('opencode', featureName)
      }),

      vscode.commands.registerCommand('hive.openTaskInOpenCode', (item: { featureName?: string; folder?: string }) => {
        if (item?.featureName && item?.folder) {
          this.launcher?.openStep('opencode', item.featureName, item.folder)
        }
      }),

      vscode.commands.registerCommand('hive.openFile', (filePath: string) => {
        if (filePath) {
          vscode.workspace.openTextDocument(filePath)
            .then(doc => vscode.window.showTextDocument(doc))
        }
      }),

      vscode.commands.registerCommand('hive.approvePlan', async (item: { featureName?: string }) => {
        if (item?.featureName) {
          const terminal = vscode.window.createTerminal('OpenCode - Hive')
          terminal.sendText(`opencode --command "hive_plan_approve"`)
          terminal.show()
        }
      }),

      vscode.commands.registerCommand('hive.syncTasks', async (item: { featureName?: string }) => {
        if (item?.featureName) {
          const terminal = vscode.window.createTerminal('OpenCode - Hive')
          terminal.sendText(`opencode --command "hive_tasks_sync"`)
          terminal.show()
        }
      }),

      vscode.commands.registerCommand('hive.startTask', async (item: { featureName?: string; folder?: string }) => {
        if (item?.featureName && item?.folder) {
          const terminal = vscode.window.createTerminal('OpenCode - Hive')
          terminal.sendText(`opencode --command "hive_exec_start task=${item.folder}"`)
          terminal.show()
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
        const featureJsonPath = path.join(this.workspaceRoot, '.hive', 'features', featureName, 'feature.json')
        const commentsPath = path.join(this.workspaceRoot, '.hive', 'features', featureName, 'comments.json')

        let sessionId: string | undefined
        let comments: Array<{ body: string; line?: number }> = []

        try {
          const featureData = JSON.parse(fs.readFileSync(featureJsonPath, 'utf-8'))
          sessionId = featureData.sessionId
        } catch (error) {
          console.warn(`Hive: failed to read sessionId for feature '${featureName}'`, error)
        }

        try {
          const commentsData = JSON.parse(fs.readFileSync(commentsPath, 'utf-8'))
          comments = commentsData.threads || []
        } catch (error) {
          console.warn(`Hive: failed to read comments for feature '${featureName}'`, error)
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

        let prompt: string
        if (hasComments) {
          const allComments = comments.map(c => `Line ${c.line}: ${c.body}`).join('\n')
          if (userInput === '') {
            prompt = `User review comments:\n${allComments}`
          } else {
            prompt = `User review comments:\n${allComments}\n\nAdditional feedback: ${userInput}`
          }
        } else {
          if (userInput === '') {
            prompt = 'User reviewed the plan and approved. Run hive_plan_approve and then hive_tasks_sync.'
          } else {
            prompt = `User review feedback: "${userInput}"`
          }
        }

        const shellEscapeSingleQuotes = (value: string): string => {
          return `'${value.replace(/'/g, `'\"'\"'`)}'`
        }

        const terminal = vscode.window.createTerminal('OpenCode - Hive')
        const escapedPrompt = shellEscapeSingleQuotes(prompt)

        if (sessionId) {
          const escapedSessionId = shellEscapeSingleQuotes(sessionId)
          terminal.sendText(`opencode run --session ${escapedSessionId} ${escapedPrompt}`)
        } else {
          terminal.sendText(`opencode run ${escapedPrompt}`)
        }

        terminal.show()
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
