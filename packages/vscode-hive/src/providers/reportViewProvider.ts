import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { HiveService } from '../services/hiveService'
import { Step } from '../types'

interface ReportJson {
  feature: string
  status: string
  steps: Array<{
    folder: string
    name: string
    order: number
    status: string
    summary?: string
  }>
  decisions: string[]
  generatedAt: string
  diffStats?: {
    filesChanged: number
    insertions: number
    deletions: number
  }
}

interface FileChange {
  path: string
  insertions: number
  deletions: number
  status: 'added' | 'modified' | 'deleted'
}

export class ReportViewProvider {
  private static panels: Map<string, vscode.WebviewPanel> = new Map()

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly hiveService: HiveService,
    private readonly workspaceRoot: string
  ) {}

  public show(featureName: string, stepFolder: string): void {
    const panelKey = `${featureName}/${stepFolder}`
    
    const existingPanel = ReportViewProvider.panels.get(panelKey)
    if (existingPanel) {
      existingPanel.reveal()
      this.updatePanel(existingPanel, featureName, stepFolder)
      return
    }

    const panel = vscode.window.createWebviewPanel(
      'hive.stepReport',
      `Report: ${stepFolder}`,
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [this.extensionUri]
      }
    )

    ReportViewProvider.panels.set(panelKey, panel)

    panel.onDidDispose(() => {
      ReportViewProvider.panels.delete(panelKey)
    })

    panel.webview.onDidReceiveMessage(message => {
      this.handleMessage(message, featureName, stepFolder)
    })

    this.updatePanel(panel, featureName, stepFolder)
  }

  private handleMessage(
    message: { command: string; filePath?: string },
    featureName: string,
    stepFolder: string
  ): void {
    switch (message.command) {
      case 'revert':
        this.revertStep(featureName, stepFolder)
        break
      case 'viewDiff':
        this.viewDiff(featureName, stepFolder)
        break
      case 'openFile':
        if (message.filePath) {
          this.openFile(message.filePath)
        }
        break
    }
  }

  private async revertStep(featureName: string, stepFolder: string): Promise<void> {
    const confirm = await vscode.window.showWarningMessage(
      `Revert step "${stepFolder}"? This will undo all changes from this step.`,
      { modal: true },
      'Revert'
    )
    
    if (confirm === 'Revert') {
      const terminal = vscode.window.createTerminal('Hive - Revert')
      terminal.sendText(`opencode --command "hive_step_revert({ stepFolder: '${stepFolder}' })"`)
      terminal.show()
    }
  }

  private viewDiff(featureName: string, stepFolder: string): void {
    const stepPath = path.join(
      this.workspaceRoot,
      '.hive',
      'features',
      featureName,
      'execution',
      stepFolder
    )
    vscode.commands.executeCommand('hive.viewDiff', stepPath)
  }

  private openFile(filePath: string): void {
    const fullPath = path.join(this.workspaceRoot, filePath)
    if (fs.existsSync(fullPath)) {
      vscode.workspace.openTextDocument(fullPath)
        .then(doc => vscode.window.showTextDocument(doc))
    } else {
      vscode.window.showWarningMessage(`File not found: ${filePath}`)
    }
  }

  private updatePanel(panel: vscode.WebviewPanel, featureName: string, stepFolder: string): void {
    const step = this.hiveService.getSteps(featureName).find(s => s.folderPath === stepFolder)
    if (!step) {
      panel.webview.html = this.getErrorHtml('Step not found')
      return
    }

    const reportData = this.getReportData(featureName, stepFolder)
    const diffPath = this.hiveService.getStepDiffPath(featureName, stepFolder)
    const fileChanges = diffPath ? this.parseFileChanges(diffPath) : []
    const decisions = this.getDecisions(featureName)
    const notes = this.getNotes(featureName, stepFolder)
    const duration = this.hiveService.formatDuration(step.startedAt, step.completedAt)

    panel.webview.html = this.getHtml({
      step,
      stepFolder,
      reportData,
      fileChanges,
      decisions,
      notes,
      duration,
      canRevert: step.execution?.canRevert ?? false
    })
  }

  private getReportData(featureName: string, stepFolder: string): ReportJson | null {
    const reportPath = path.join(
      this.workspaceRoot,
      '.hive',
      'features',
      featureName,
      'execution',
      stepFolder,
      'report.json'
    )
    
    try {
      const content = fs.readFileSync(reportPath, 'utf-8')
      return JSON.parse(content)
    } catch {
      return null
    }
  }

  private parseFileChanges(diffPath: string): FileChange[] {
    try {
      const content = fs.readFileSync(diffPath, 'utf-8')
      return this.extractFileChangesFromUnifiedDiff(content)
    } catch {
      return []
    }
  }

  private extractFileChangesFromUnifiedDiff(diffContent: string): FileChange[] {
    const files: FileChange[] = []
    const fileSections = diffContent.split(/^diff --git /gm).slice(1)
    
    for (const section of fileSections) {
      const pathMatch = section.match(/^a\/(.+?) b\/(.+?)$/m)
      if (!pathMatch) continue
      
      const filePath = pathMatch[2]
      const insertions = (section.match(/^\+[^+]/gm) || []).length
      const deletions = (section.match(/^-[^-]/gm) || []).length
      const status = this.detectFileStatus(section)
      
      files.push({ path: filePath, insertions, deletions, status })
    }
    
    return files
  }

  private detectFileStatus(diffSection: string): 'added' | 'modified' | 'deleted' {
    if (diffSection.includes('new file mode')) return 'added'
    if (diffSection.includes('deleted file mode')) return 'deleted'
    return 'modified'
  }

  private getDecisions(featureName: string): string[] {
    const context = this.hiveService.getContext(featureName)
    if (!context.decisions) return []
    
    return this.extractMarkdownListItems(context.decisions)
  }

  private extractMarkdownListItems(markdown: string): string[] {
    const bulletOrNumberPattern = /^[-*]\s|^\d+\.\s/
    
    return markdown
      .split('\n')
      .map(line => line.trim())
      .filter(line => bulletOrNumberPattern.test(line))
      .map(line => line.replace(bulletOrNumberPattern, ''))
  }

  private getNotes(featureName: string, stepFolder: string): string[] {
    const specPath = path.join(
      this.workspaceRoot,
      '.hive',
      'features',
      featureName,
      'execution',
      stepFolder,
      'spec.md'
    )
    
    try {
      const content = fs.readFileSync(specPath, 'utf-8')
      return this.extractWarningLines(content)
    } catch {
      return []
    }
  }

  private extractWarningLines(content: string): string[] {
    const warningIndicators = ['WARNING', 'CAUTION', 'NOTE:', 'TODO:']
    
    return content
      .split('\n')
      .filter(line => warningIndicators.some(indicator => line.includes(indicator)))
      .map(line => line.trim())
  }

  private getErrorHtml(message: string): string {
    return `<!DOCTYPE html>
<html>
<head>
  <style>
    body { 
      font-family: var(--vscode-font-family); 
      padding: 20px; 
      color: var(--vscode-foreground);
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
    }
    .error { 
      color: var(--vscode-errorForeground); 
      font-size: 16px;
    }
  </style>
</head>
<body>
  <div class="error">${this.escapeHtml(message)}</div>
</body>
</html>`
  }

  private getHtml(data: {
    step: Step
    stepFolder: string
    reportData: ReportJson | null
    fileChanges: FileChange[]
    decisions: string[]
    notes: string[]
    duration: string
    canRevert: boolean
  }): string {
    const { step, stepFolder, reportData, fileChanges, decisions, notes, duration, canRevert } = data
    
    const statusIcon = step.status === 'done' ? '&#x2705;' : 
                       step.status === 'in_progress' ? '&#x1F504;' : 
                       step.status === 'blocked' ? '&#x274C;' : '&#x23F8;'
    
    const statusText = step.status.toUpperCase().replace('_', ' ')
    const statusClass = step.status === 'done' ? 'success' : 
                        step.status === 'in_progress' ? 'in-progress' : 
                        step.status === 'blocked' ? 'error' : 'pending'

    const filesHtml = fileChanges.length > 0 
      ? fileChanges.map(f => this.renderFileChange(f)).join('')
      : '<div class="empty">No file changes recorded</div>'

    const decisionsHtml = decisions.length > 0
      ? decisions.map(d => `<div class="decision-item">&#x2022; ${this.escapeHtml(d)}</div>`).join('')
      : '<div class="empty">No decisions recorded</div>'

    const notesHtml = notes.length > 0
      ? notes.map(n => `<div class="note-item">&#x26A0;&#xFE0F; ${this.escapeHtml(n)}</div>`).join('')
      : ''

    const diffStats = reportData?.diffStats || this.hiveService.getStepReport(step.folderPath.split('/')[0] || '', stepFolder)
    const statsText = diffStats 
      ? `${diffStats.filesChanged} files, +${diffStats.insertions} -${diffStats.deletions}`
      : ''

    return `<!DOCTYPE html>
<html>
<head>
  <style>
    :root {
      --border-color: var(--vscode-panel-border);
      --bg-color: var(--vscode-editor-background);
      --fg-color: var(--vscode-foreground);
      --section-bg: var(--vscode-sideBar-background);
      --button-bg: var(--vscode-button-background);
      --button-fg: var(--vscode-button-foreground);
      --button-hover: var(--vscode-button-hoverBackground);
      --link-color: var(--vscode-textLink-foreground);
      --success-color: #4caf50;
      --warning-color: #ff9800;
      --error-color: #f44336;
    }
    
    * {
      box-sizing: border-box;
    }
    
    body { 
      font-family: var(--vscode-font-family); 
      padding: 0;
      margin: 0;
      color: var(--fg-color);
      background: var(--bg-color);
    }
    
    .container {
      max-width: 800px;
      margin: 0 auto;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      overflow: hidden;
      margin-top: 20px;
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      background: var(--section-bg);
      border-bottom: 1px solid var(--border-color);
    }
    
    .header-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 600;
    }
    
    .content {
      padding: 16px;
    }
    
    .status-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    
    .status {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 18px;
      font-weight: 600;
    }
    
    .status.success { color: var(--success-color); }
    .status.in-progress { color: var(--warning-color); }
    .status.error { color: var(--error-color); }
    .status.pending { opacity: 0.6; }
    
    .duration {
      font-size: 14px;
      opacity: 0.7;
    }
    
    .summary {
      font-size: 13px;
      opacity: 0.85;
      margin-bottom: 16px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border-color);
    }
    
    .section {
      margin-bottom: 16px;
    }
    
    .section-title {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      opacity: 0.7;
      margin-bottom: 8px;
      padding-bottom: 4px;
      border-bottom: 1px solid var(--border-color);
    }
    
    .file-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 8px;
      border-radius: 4px;
      margin-bottom: 4px;
      background: var(--section-bg);
    }
    
    .file-info {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .file-icon {
      font-size: 14px;
    }
    
    .file-icon.added { color: var(--success-color); }
    .file-icon.modified { color: var(--warning-color); }
    .file-icon.deleted { color: var(--error-color); }
    
    .file-path {
      font-size: 12px;
      font-family: var(--vscode-editor-font-family);
    }
    
    .file-stats {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .stat {
      font-size: 11px;
      font-family: var(--vscode-editor-font-family);
    }
    
    .stat.additions { color: var(--success-color); }
    .stat.deletions { color: var(--error-color); }
    
    .open-btn {
      background: transparent;
      border: 1px solid var(--border-color);
      color: var(--link-color);
      padding: 2px 8px;
      border-radius: 3px;
      cursor: pointer;
      font-size: 11px;
    }
    
    .open-btn:hover {
      background: var(--button-bg);
      color: var(--button-fg);
      border-color: var(--button-bg);
    }
    
    .decision-item, .note-item {
      font-size: 13px;
      padding: 4px 0;
    }
    
    .note-item {
      color: var(--warning-color);
    }
    
    .empty {
      font-size: 13px;
      opacity: 0.5;
      font-style: italic;
    }
    
    .footer {
      display: flex;
      justify-content: center;
      gap: 12px;
      padding: 16px;
      border-top: 1px solid var(--border-color);
      background: var(--section-bg);
    }
    
    .action-btn {
      background: var(--button-bg);
      color: var(--button-fg);
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .action-btn:hover {
      background: var(--button-hover);
    }
    
    .action-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .action-btn.secondary {
      background: transparent;
      border: 1px solid var(--border-color);
      color: var(--fg-color);
    }
    
    .action-btn.secondary:hover {
      background: var(--section-bg);
    }
    
    .action-btn.danger {
      background: var(--error-color);
    }
    
    .action-btn.danger:hover {
      opacity: 0.9;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-title">
        &#x1F4CB; Report: ${this.escapeHtml(stepFolder)}
      </div>
    </div>
    
    <div class="content">
      <div class="status-row">
        <div class="status ${statusClass}">
          ${statusIcon} ${statusText}
        </div>
        ${duration ? `<div class="duration">${this.escapeHtml(duration)}</div>` : ''}
      </div>
      
      ${step.summary ? `<div class="summary">${this.escapeHtml(step.summary)}</div>` : ''}
      
      <div class="section">
        <div class="section-title">Files Changed ${statsText ? `(${statsText})` : ''}</div>
        ${filesHtml}
      </div>
      
      <div class="section">
        <div class="section-title">Decisions</div>
        ${decisionsHtml}
      </div>
      
      ${notesHtml ? `
      <div class="section">
        <div class="section-title">Notes</div>
        ${notesHtml}
      </div>
      ` : ''}
    </div>
    
    <div class="footer">
      <button class="action-btn danger" onclick="revert()" ${canRevert ? '' : 'disabled'}>
        &#x21A9; Revert This Step
      </button>
      <button class="action-btn secondary" onclick="viewDiff()">
        View Full Diff
      </button>
    </div>
  </div>
  
  <script>
    const vscode = acquireVsCodeApi();
    
    function revert() {
      vscode.postMessage({ command: 'revert' });
    }
    
    function viewDiff() {
      vscode.postMessage({ command: 'viewDiff' });
    }
    
    function openFile(filePath) {
      vscode.postMessage({ command: 'openFile', filePath });
    }
  </script>
</body>
</html>`
  }

  private renderFileChange(file: FileChange): string {
    const icon = file.status === 'added' ? '&#x2728;' : 
                 file.status === 'deleted' ? '&#x1F5D1;' : '&#x1F4DD;'
    const iconClass = file.status
    
    const additions = file.insertions > 0 ? `+${file.insertions}` : ''
    const deletions = file.deletions > 0 ? `-${file.deletions}` : ''
    
    return `
      <div class="file-item">
        <div class="file-info">
          <span class="file-icon ${iconClass}">${icon}</span>
          <span class="file-path">${this.escapeHtml(file.path)}</span>
        </div>
        <div class="file-stats">
          ${additions ? `<span class="stat additions">${additions}</span>` : ''}
          ${deletions ? `<span class="stat deletions">${deletions}</span>` : ''}
          <button class="open-btn" onclick="openFile('${this.escapeHtml(file.path)}')">Open</button>
        </div>
      </div>
    `
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }
}
