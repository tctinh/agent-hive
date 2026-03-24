import * as vscode from 'vscode'

export class HiveWatcher {
  private hiveWatcher: vscode.FileSystemWatcher
  private githubWatcher: vscode.FileSystemWatcher
  private pluginWatcher: vscode.FileSystemWatcher

  constructor(workspaceRoot: string, onChange: () => void) {
    this.hiveWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(workspaceRoot, '.hive/**/*')
    )
    this.githubWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(workspaceRoot, '.github/**/*')
    )
    this.pluginWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(workspaceRoot, 'plugin.json')
    )

    for (const watcher of [this.hiveWatcher, this.githubWatcher, this.pluginWatcher]) {
      watcher.onDidCreate(onChange)
      watcher.onDidChange(onChange)
      watcher.onDidDelete(onChange)
    }
  }

  dispose(): void {
    this.hiveWatcher.dispose()
    this.githubWatcher.dispose()
    this.pluginWatcher.dispose()
  }
}
