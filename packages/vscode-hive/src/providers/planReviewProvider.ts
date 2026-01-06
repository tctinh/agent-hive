import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { HiveService } from '../services/hiveService'
import { PlanComment, PlanJson, PlanTask } from '../types'

interface PlanMeta {
  version: number
  status: string
  generatedAt: string
  lastUpdatedAt: string
  approvedAt?: string
  approvedBy?: string
}

export class PlanReviewProvider {
  private panel: vscode.WebviewPanel | null = null
  private currentFeature: string | null = null

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly hiveService: HiveService,
    private readonly workspaceRoot: string
  ) {}

  async show(featureName: string): Promise<void> {
    this.currentFeature = featureName

    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.One)
    } else {
      this.panel = vscode.window.createWebviewPanel(
        'hivePlanReview',
        `Plan Review: ${featureName}`,
        vscode.ViewColumn.One,
        { enableScripts: true, retainContextWhenHidden: true }
      )

      this.panel.onDidDispose(() => {
        this.panel = null
      })

      this.setupMessageHandlers()
    }

    await this.refresh()
  }

  private async refresh(): Promise<void> {
    if (!this.panel || !this.currentFeature) return

    const planJson = this.hiveService.getPlanJson(this.currentFeature)
    const planContent = this.hiveService.getPlanContent(this.currentFeature)
    const comments = this.hiveService.getPlanComments(this.currentFeature)

    const planMeta: PlanMeta | null = planJson ? {
      version: planJson.version,
      status: planJson.status,
      generatedAt: planJson.createdAt,
      lastUpdatedAt: planJson.updatedAt,
    } : null

    this.panel.title = `Plan Review: ${this.currentFeature}`
    this.panel.webview.html = this.getHtml(this.currentFeature, planJson, planContent, planMeta, comments)
  }

  private setupMessageHandlers(): void {
    if (!this.panel) return

    this.panel.webview.onDidReceiveMessage(async (msg) => {
      if (!this.currentFeature) return

      switch (msg.type) {
        case 'approve':
          await this.approvePlan(this.currentFeature)
          await this.refresh()
          vscode.window.showInformationMessage('Plan approved!')
          break

        case 'addComment':
          await this.addComment(this.currentFeature, msg.content, msg.taskId)
          await this.refresh()
          break

        case 'requestRevision':
          const terminal = vscode.window.createTerminal('OpenCode - Hive')
          terminal.sendText(`opencode "Please revise the plan based on the review comments"`)
          terminal.show()
          break

        case 'toggleSpec':
          break
      }
    })
  }

  private async approvePlan(feature: string): Promise<void> {
    const planPath = path.join(this.workspaceRoot, '.hive', 'features', feature, 'plan.json')
    if (!fs.existsSync(planPath)) {
      const metaPath = path.join(this.workspaceRoot, '.hive', 'features', feature, 'plan.meta.json')
      if (!fs.existsSync(metaPath)) return

      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'))
        meta.status = 'approved'
        meta.approvedAt = new Date().toISOString()
        meta.approvedBy = 'user'
        fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2))
      } catch {}
      return
    }

    try {
      const plan: PlanJson = JSON.parse(fs.readFileSync(planPath, 'utf-8'))
      plan.status = 'approved'
      plan.updatedAt = new Date().toISOString()
      fs.writeFileSync(planPath, JSON.stringify(plan, null, 2))

      const featurePath = path.join(this.workspaceRoot, '.hive', 'features', feature, 'feature.json')
      if (fs.existsSync(featurePath)) {
        const featureJson = JSON.parse(fs.readFileSync(featurePath, 'utf-8'))
        if (featureJson.plan) {
          featureJson.plan.status = 'approved'
          featureJson.plan.approvedAt = new Date().toISOString()
          featureJson.plan.approvedBy = 'user'
          fs.writeFileSync(featurePath, JSON.stringify(featureJson, null, 2))
        }
      }
    } catch {}
  }

  private async addComment(feature: string, content: string, taskId?: string): Promise<void> {
    const commentsPath = path.join(this.workspaceRoot, '.hive', 'features', feature, 'comments.json')
    let data: { comments: PlanComment[] } = { comments: [] }

    if (fs.existsSync(commentsPath)) {
      try {
        data = JSON.parse(fs.readFileSync(commentsPath, 'utf-8'))
      } catch {}
    }

    const citations = this.extractCitations(content)
    data.comments.push({
      id: Date.now().toString(36),
      author: 'user',
      content,
      createdAt: new Date().toISOString(),
      citations,
      taskId
    })

    fs.writeFileSync(commentsPath, JSON.stringify(data, null, 2))
  }

  private extractCitations(content: string): string[] {
    const matches = content.match(/@cite:([^\s]+)/g) || []
    return matches.map(m => m.replace('@cite:', ''))
  }

  private getStatusIcon(status: string): string {
    switch (status) {
      case 'done': return '✅'
      case 'in_progress': return '🔄'
      case 'cancelled': return '⏭️'
      case 'failed': return '❌'
      case 'blocked': return '🚫'
      case 'reverted': return '↩️'
      default: return '⬜'
    }
  }

  private getStatusBadge(status: string): string {
    const colors: Record<string, string> = {
      'done': '#28a745',
      'in_progress': '#ffc107',
      'pending': '#6c757d',
      'cancelled': '#6c757d',
      'failed': '#dc3545',
      'blocked': '#dc3545',
      'reverted': '#17a2b8'
    }
    const color = colors[status] || colors['pending']
    return `<span style="background: ${color}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px;">${status}</span>`
  }

  private renderTasksHtml(tasks: PlanTask[]): string {
    if (!tasks || tasks.length === 0) {
      return '<div class="no-tasks">No tasks defined yet.</div>'
    }

    const tasksByOrder: Record<number, PlanTask[]> = {}
    for (const task of tasks) {
      if (!tasksByOrder[task.order]) {
        tasksByOrder[task.order] = []
      }
      tasksByOrder[task.order].push(task)
    }

    const orders = Object.keys(tasksByOrder).map(Number).sort((a, b) => a - b)
    let html = ''

    for (const order of orders) {
      const batch = tasksByOrder[order]
      const isParallel = batch.length > 1
      const batchLabel = isParallel ? `Batch ${order} (parallel)` : `Step ${order}`

      html += `<div class="batch">
        <div class="batch-header">${batchLabel}</div>
        <div class="batch-tasks">`

      for (const task of batch) {
        const icon = this.getStatusIcon(task.status)
        const badge = this.getStatusBadge(task.status)
        const specPreview = task.spec.split('\n').slice(0, 3).join('\n')

        html += `<div class="task" data-task-id="${task.id}">
          <div class="task-header">
            <span class="task-icon">${icon}</span>
            <span class="task-name"><strong>${this.escapeHtml(task.id)}</strong>: ${this.escapeHtml(task.name)}</span>
            ${badge}
          </div>
          <div class="task-spec-toggle" onclick="toggleSpec('${task.id}')">▶ Show spec</div>
          <div class="task-spec" id="spec-${task.id}" style="display: none;">
            <pre>${this.escapeHtml(task.spec)}</pre>
          </div>
          ${task.dependencies?.length ? `<div class="task-deps">Dependencies: ${task.dependencies.join(', ')}</div>` : ''}
        </div>`
      }

      html += `</div></div>`
    }

    return html
  }

  private getHtml(feature: string, planJson: PlanJson | null, planContent: string | null, planMeta: PlanMeta | null, comments: PlanComment[]): string {
    const status = planMeta?.status || 'no-plan'
    const statusIcon = status === 'approved' ? '✅' : status === 'draft' ? '📝' : status === 'locked' ? '🔒' : '❓'
    const canApprove = status === 'draft'

    const tasksHtml = planJson ? this.renderTasksHtml(planJson.tasks) : ''
    const decisionsHtml = planJson?.decisions?.length 
      ? `<div class="decisions">
          <h4>Decisions</h4>
          <ul>${planJson.decisions.map(d => `<li><strong>${this.escapeHtml(d.title)}</strong> (${d.file})</li>`).join('')}</ul>
        </div>`
      : ''

    return `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: var(--vscode-font-family); padding: 16px; color: var(--vscode-foreground); }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 1px solid var(--vscode-panel-border); padding-bottom: 12px; }
    .header h2 { margin: 0; }
    .status { font-size: 12px; opacity: 0.8; }
    .actions { display: flex; gap: 8px; }
    button { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; padding: 6px 12px; cursor: pointer; border-radius: 3px; }
    button:hover { background: var(--vscode-button-hoverBackground); }
    button.secondary { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); }
    .no-plan, .no-tasks { text-align: center; padding: 40px; opacity: 0.6; }
    
    .summary { background: var(--vscode-editor-background); padding: 12px; margin-bottom: 16px; border-left: 3px solid var(--vscode-editorInfo-foreground); }
    .decisions { margin-bottom: 16px; }
    .decisions ul { margin: 8px 0; padding-left: 20px; }
    
    .batch { margin-bottom: 16px; }
    .batch-header { font-weight: bold; padding: 8px; background: var(--vscode-sideBar-background); border-bottom: 1px solid var(--vscode-panel-border); }
    .batch-tasks { padding: 8px; }
    
    .task { background: var(--vscode-editor-background); border: 1px solid var(--vscode-panel-border); padding: 12px; margin-bottom: 8px; border-radius: 4px; }
    .task-header { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .task-icon { font-size: 16px; }
    .task-name { flex: 1; }
    .task-spec-toggle { font-size: 12px; color: var(--vscode-textLink-foreground); cursor: pointer; margin-top: 8px; }
    .task-spec { margin-top: 8px; }
    .task-spec pre { background: var(--vscode-textCodeBlock-background); padding: 8px; font-size: 12px; overflow: auto; max-height: 200px; white-space: pre-wrap; }
    .task-deps { font-size: 11px; opacity: 0.7; margin-top: 4px; }
    
    .comments { margin-top: 24px; }
    .comment { background: var(--vscode-editor-background); border-left: 3px solid var(--vscode-editorInfo-foreground); padding: 12px; margin-bottom: 8px; }
    .comment-header { font-size: 11px; opacity: 0.7; margin-bottom: 4px; }
    .comment-task { font-size: 11px; color: var(--vscode-textLink-foreground); }
    .add-comment { margin-top: 16px; }
    textarea { width: 100%; min-height: 80px; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); padding: 8px; font-family: inherit; box-sizing: border-box; }
    .add-btn { margin-top: 8px; }
    
    .legacy-content { background: var(--vscode-editor-background); border: 1px solid var(--vscode-panel-border); padding: 16px; white-space: pre-wrap; font-family: monospace; font-size: 13px; max-height: 400px; overflow: auto; margin-bottom: 16px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h2>${statusIcon} Plan: ${this.escapeHtml(feature)}</h2>
      <div class="status">v${planMeta?.version || 0} | ${status}${planMeta?.lastUpdatedAt ? ` | Updated: ${new Date(planMeta.lastUpdatedAt).toLocaleDateString()}` : ''}</div>
    </div>
    <div class="actions">
      ${canApprove ? '<button onclick="approve()">✅ Approve</button>' : ''}
      ${status === 'draft' ? '<button class="secondary" onclick="requestRevision()">🔄 Request Revision</button>' : ''}
    </div>
  </div>

  ${planJson ? `
    ${planJson.summary ? `<div class="summary">${this.escapeHtml(planJson.summary)}</div>` : ''}
    ${decisionsHtml}
    <h3>📋 Tasks (${planJson.tasks.length})</h3>
    ${tasksHtml}
  ` : planContent ? `
    <div class="legacy-content">${this.escapeHtml(planContent)}</div>
  ` : `
    <div class="no-plan">No plan generated yet. Use hive_plan_generate to create one.</div>
  `}

  <div class="comments">
    <h3>💬 Comments (${comments.length})</h3>
    ${comments.map(c => `
      <div class="comment">
        <div class="comment-header">${c.author} • ${new Date(c.createdAt).toLocaleString()}</div>
        ${c.taskId ? `<div class="comment-task">On task: ${c.taskId}</div>` : ''}
        <div>${this.escapeHtml(c.content)}</div>
      </div>
    `).join('')}
    
    <div class="add-comment">
      <textarea id="commentInput" placeholder="Add a comment... Use @cite:path/to/file.ts to reference code"></textarea>
      <button class="add-btn" onclick="addComment()">Add Comment</button>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    function approve() { vscode.postMessage({ type: 'approve' }); }
    function requestRevision() { vscode.postMessage({ type: 'requestRevision' }); }
    function addComment() {
      const content = document.getElementById('commentInput').value.trim();
      if (content) {
        vscode.postMessage({ type: 'addComment', content });
        document.getElementById('commentInput').value = '';
      }
    }
    function toggleSpec(taskId) {
      const el = document.getElementById('spec-' + taskId);
      const toggle = el.previousElementSibling;
      if (el.style.display === 'none') {
        el.style.display = 'block';
        toggle.textContent = '▼ Hide spec';
      } else {
        el.style.display = 'none';
        toggle.textContent = '▶ Show spec';
      }
    }
  </script>
</body>
</html>`
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }
}
