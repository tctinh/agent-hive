import * as vscode from 'vscode'
import * as path from 'path'

/**
 * Launcher for Hive features - works with GitHub Copilot Chat
 * Replaces the OpenCode-specific launcher
 */
export class Launcher {
  constructor(private workspaceRoot: string) {}

  /**
   * Open a feature's plan in VS Code and show instructions
   */
  async openFeature(feature: string): Promise<void> {
    const planPath = path.join(this.workspaceRoot, '.hive', 'features', feature, 'plan.md')
    try {
      const doc = await vscode.workspace.openTextDocument(planPath)
      await vscode.window.showTextDocument(doc)
      vscode.window.showInformationMessage(
        `Hive: Opened ${feature} plan. Use @Hive in Copilot Chat to continue.`
      )
    } catch {
      vscode.window.showWarningMessage(`Hive: No plan found for feature "${feature}"`)
    }
  }

  /**
   * Open a task's worktree folder in a new VS Code window
   */
  async openTask(feature: string, task: string): Promise<void> {
    const worktreePath = path.join(this.workspaceRoot, '.hive', '.worktrees', feature, task)
    const uri = vscode.Uri.file(worktreePath)
    
    try {
      await vscode.commands.executeCommand('vscode.openFolder', uri, { forceNewWindow: true })
    } catch {
      vscode.window.showErrorMessage(`Hive: Worktree not found for ${feature}/${task}`)
    }
  }

  /**
   * Open a file in VS Code
   */
  async openFile(filePath: string): Promise<void> {
    try {
      const doc = await vscode.workspace.openTextDocument(filePath)
      await vscode.window.showTextDocument(doc)
    } catch {
      vscode.window.showErrorMessage(`Hive: Could not open file "${filePath}"`)
    }
  }
}
