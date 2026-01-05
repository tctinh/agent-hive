import * as vscode from 'vscode'
import * as fs from 'fs'

export async function viewDiff(diffPath: string | vscode.Uri): Promise<void> {
  const filePath = typeof diffPath === 'string' ? diffPath : diffPath.fsPath
  
  if (!fs.existsSync(filePath)) {
    vscode.window.showWarningMessage('No diff file found for this step')
    return
  }

  const diffContent = fs.readFileSync(filePath, 'utf-8')
  
  if (!diffContent.trim()) {
    vscode.window.showInformationMessage('Diff file is empty - no changes recorded')
    return
  }

  const doc = await vscode.workspace.openTextDocument({
    content: diffContent,
    language: 'diff'
  })
  
  await vscode.window.showTextDocument(doc, {
    preview: true,
    viewColumn: vscode.ViewColumn.Beside
  })
}
