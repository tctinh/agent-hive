import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Launcher for Hive features - works with GitHub Copilot Chat
 * Replaces OpenCode-specific launcher
 */
export class Launcher {
  constructor(private workspaceRoot: string) {}

  /**
   * Open a feature's overview in VS Code and show instructions
   */
  async openFeature(feature: string): Promise<void> {
    if (!feature || !this.workspaceRoot) {
      vscode.window.showWarningMessage('Hive: Invalid feature name or workspace root')
      return
    }

    const overviewPath = path.join(this.workspaceRoot, '.hive', 'features', feature, 'context', 'overview.md')
    const planPath = path.join(this.workspaceRoot, '.hive', 'features', feature, 'plan.md')
    const targetPath = fs.existsSync(overviewPath) ? overviewPath : planPath
    try {
      const uri = vscode.Uri.file(targetPath)
      await vscode.workspace.openTextDocument(uri)
      await vscode.window.showTextDocument(uri)
      vscode.window.showInformationMessage(
        `Hive: Opened ${feature} ${fs.existsSync(overviewPath) ? 'overview' : 'plan'}. Use @Hive in Copilot Chat to continue.`
      )
    } catch (error: any) {
      vscode.window.showWarningMessage(`Hive: No overview or plan found for feature "${feature}" - ${error}`)
    }
  }

  /**
   * Open a task's worktree folder in a new VS Code window
   */
  async openTask(feature: string, task: string): Promise<void> {
    if (!feature || !task || !this.workspaceRoot) {
      vscode.window.showWarningMessage('Hive: Invalid feature name, task name, or workspace root')
      return
    }

    const worktreePath = path.join(this.workspaceRoot, '.hive', '.worktrees', feature, task)
    const uri = vscode.Uri.file(worktreePath)

    try {
      await vscode.commands.executeCommand('vscode.openFolder', uri, { forceNewWindow: true })
    } catch (error: any) {
      vscode.window.showErrorMessage(`Hive: Worktree not found for ${feature}/${task} - ${error}`)
    }
  }

  /**
   * Open a file in VS Code
   */
  async openFile(filePath: string): Promise<void> {
    if (!filePath || !this.workspaceRoot) {
      vscode.window.showWarningMessage('Hive: Invalid file path or workspace root')
      return
    }

    try {
      const uri = vscode.Uri.file(filePath)
      await vscode.workspace.openTextDocument(uri)
      await vscode.window.showTextDocument(uri)
    } catch (error: any) {
      vscode.window.showErrorMessage(`Hive: Could not open file "${filePath}" - ${error}`)
    }
  }
}
