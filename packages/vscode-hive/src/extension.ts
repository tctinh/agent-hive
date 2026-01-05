import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { HiveService, HiveWatcher, Launcher, CheckpointService } from './services'
import { HiveSidebarProvider, HivePanelProvider, ReportViewProvider } from './providers'
import { viewDiff } from './commands'

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

export function activate(context: vscode.ExtensionContext): void {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
  if (!workspaceFolder) return

  const workspaceRoot = findHiveRoot(workspaceFolder)
  if (!workspaceRoot) return

  const hiveService = new HiveService(workspaceRoot)
  const launcher = new Launcher(workspaceRoot)
  const checkpointService = new CheckpointService(workspaceRoot)

  context.subscriptions.push(
    vscode.commands.registerCommand('hive.refresh', () => {
      const sidebarProvider = new HiveSidebarProvider(hiveService)
      sidebarProvider.refresh()
    }),

    vscode.commands.registerCommand('hive.newFeature', async () => {
      const name = await vscode.window.showInputBox({
        prompt: 'Feature name',
        placeHolder: 'my-feature'
      })
      if (name) {
        const terminal = vscode.window.createTerminal('OpenCode - Hive')
        terminal.sendText(`opencode --command "/hive new ${name}"`)
        terminal.show()
      }
    }),

    vscode.commands.registerCommand('hive.openStepInOpenCode', (featureName: string, stepName: string, sessionId?: string) => {
      launcher.openStep('opencode', featureName, stepName, sessionId)
    }),

    vscode.commands.registerCommand('hive.openFeatureInOpenCode', (featureName: string) => {
      launcher.openFeature('opencode', featureName)
    }),

    vscode.commands.registerCommand('hive.viewReport', (feature: string) => {
      const report = hiveService.getReport(feature)
      if (report) {
        vscode.workspace.openTextDocument({ content: report, language: 'markdown' })
          .then(doc => vscode.window.showTextDocument(doc))
      } else {
        vscode.window.showInformationMessage('No report generated yet')
      }
    }),

    vscode.commands.registerCommand('hive.showFeature', (featureName: string) => {
      const panelProvider = new HivePanelProvider(context.extensionUri, hiveService)
      panelProvider.showFeature(featureName)
    }),

    vscode.commands.registerCommand('hive.openInOpenCode', (item: { featureName?: string; stepFolder?: string; sessionId?: string }) => {
      if (item?.featureName && item?.stepFolder) {
        launcher.openStep('opencode', item.featureName, item.stepFolder, item.sessionId)
      }
    }),

    vscode.commands.registerCommand('hive.openFile', (filePath: string) => {
      if (filePath) {
        vscode.workspace.openTextDocument(filePath)
          .then(doc => vscode.window.showTextDocument(doc))
      }
    }),

    vscode.commands.registerCommand('hive.viewFeatureDetails', (item: { featureName?: string }) => {
      if (item?.featureName) {
        const panelProvider = new HivePanelProvider(context.extensionUri, hiveService)
        panelProvider.showFeature(item.featureName)
      }
    }),

    vscode.commands.registerCommand('hive.openSession', (item: { session?: { id: string } }) => {
      if (item?.session?.id) {
        launcher.openSession(item.session.id)
      }
    }),

    vscode.commands.registerCommand('hive.viewDiff', (stepPath: string) => {
      viewDiff(stepPath)
    }),

    vscode.commands.registerCommand('hive.viewStepReport', (item: { featureName?: string; stepFolder?: string }) => {
      if (item?.featureName && item?.stepFolder) {
        const reportViewProvider = new ReportViewProvider(context.extensionUri, hiveService, workspaceRoot)
        reportViewProvider.show(item.featureName, item.stepFolder)
      }
    }),

    vscode.commands.registerCommand('hive.revertStep', async (item: { featureName?: string; stepFolder?: string }) => {
      if (item?.featureName && item?.stepFolder) {
        const confirm = await vscode.window.showWarningMessage(
          'Revert this step? Changes will be undone.',
          { modal: true },
          'Revert'
        )
        if (confirm === 'Revert') {
          const result = await checkpointService.revertStep(item.featureName, item.stepFolder)
          if (result.success) {
            vscode.window.showInformationMessage('Step reverted')
          } else {
            vscode.window.showErrorMessage(`Failed to revert: ${result.error}`)
          }
          const sidebarProvider = new HiveSidebarProvider(hiveService)
          sidebarProvider.refresh()
        }
      }
    }),

    vscode.commands.registerCommand('hive.revertBatch', async (item: { featureName?: string; order?: number }) => {
      if (item?.featureName && item?.order) {
        const confirm = await vscode.window.showWarningMessage(
          `Revert batch ${item.order}? All steps in this batch will be reverted.`,
          { modal: true },
          'Revert'
        )
        if (confirm === 'Revert') {
          const results = await checkpointService.revertBatch(item.featureName, item.order)
          const failed = results.filter(r => !r.success)
          if (failed.length === 0) {
            vscode.window.showInformationMessage(`Batch ${item.order} reverted`)
          } else {
            vscode.window.showErrorMessage(`Some steps failed to revert: ${failed.map(f => f.error).join(', ')}`)
          }
          const sidebarProvider = new HiveSidebarProvider(hiveService)
          sidebarProvider.refresh()
        }
      }
    }),

    vscode.commands.registerCommand('hive.executeBatch', async (item: { featureName?: string; order?: number }) => {
      if (item?.featureName && item?.order) {
        const confirm = await vscode.window.showInformationMessage(
          `Execute batch ${item.order}? This will run all pending steps in this batch.`,
          { modal: true },
          'Execute'
        )
        if (confirm === 'Execute') {
          const terminal = vscode.window.createTerminal('OpenCode - Hive')
          terminal.sendText(`opencode --command "/hive execute --batch ${item.order}"`)
          terminal.show()
        }
      }
    })
  )

  if (!hiveService.exists()) return

  const sidebarProvider = new HiveSidebarProvider(hiveService)
  vscode.window.registerTreeDataProvider('hive.features', sidebarProvider)

  const panelProvider = new HivePanelProvider(context.extensionUri, hiveService)
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(HivePanelProvider.viewType, panelProvider)
  )

  const watcher = new HiveWatcher(workspaceRoot, () => sidebarProvider.refresh())
  context.subscriptions.push({ dispose: () => watcher.dispose() })
}

export function deactivate(): void {}
