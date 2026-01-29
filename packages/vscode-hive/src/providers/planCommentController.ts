import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'

interface StoredThread {
  id: string
  line: number
  body: string
  replies: string[]
}

interface CommentsFile {
  threads: StoredThread[]
}

export class PlanCommentController {
  private controller: vscode.CommentController
  private threads = new Map<string, vscode.CommentThread>()
  private commentsWatcher: vscode.FileSystemWatcher | undefined
  private normalizedWorkspaceRoot: string

  constructor(private workspaceRoot: string) {
    this.normalizedWorkspaceRoot = this.normalizePath(workspaceRoot)
    this.controller = vscode.comments.createCommentController(
      'hive-plan-review',
      'Plan Review'
    )

    this.controller.commentingRangeProvider = {
      provideCommentingRanges: (document: vscode.TextDocument) => {
        if (path.basename(document.fileName) !== 'plan.md') return []
        return [new vscode.Range(0, 0, document.lineCount - 1, 0)]
      }
    }

    const pattern = new vscode.RelativePattern(
      workspaceRoot,
      '.hive/features/*/comments.json'
    )
    this.commentsWatcher = vscode.workspace.createFileSystemWatcher(pattern)
    this.commentsWatcher.onDidChange(uri => this.onCommentsFileChanged(uri))
    this.commentsWatcher.onDidDelete(uri => this.onCommentsFileChanged(uri))
  }

  private onCommentsFileChanged(commentsUri: vscode.Uri): void {
    const featureMatch = this.getFeatureMatch(commentsUri.fsPath)
    if (!featureMatch) return
    const planPath = path.join(this.workspaceRoot, '.hive', 'features', featureMatch, 'plan.md')
    this.loadComments(vscode.Uri.file(planPath))
  }

  registerCommands(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
      this.controller,

      vscode.commands.registerCommand('hive.comment.create', (reply: vscode.CommentReply) => {
        this.createComment(reply)
      }),

      vscode.commands.registerCommand('hive.comment.reply', (reply: vscode.CommentReply) => {
        this.replyToComment(reply)
      }),

      vscode.commands.registerCommand('hive.comment.resolve', (thread: vscode.CommentThread) => {
        thread.dispose()
        this.saveComments(thread.uri)
      }),

      vscode.commands.registerCommand('hive.comment.delete', (comment: vscode.Comment) => {
        for (const [id, thread] of this.threads) {
          const commentIndex = thread.comments.findIndex(c => c === comment)
          if (commentIndex !== -1) {
            thread.comments = thread.comments.filter(c => c !== comment)
            if (thread.comments.length === 0) {
              thread.dispose()
              this.threads.delete(id)
            }
            this.saveComments(thread.uri)
            break
          }
        }
      }),

      vscode.workspace.onDidOpenTextDocument(doc => {
        if (path.basename(doc.fileName) === 'plan.md') {
          this.loadComments(doc.uri)
        }
      }),

      vscode.workspace.onDidSaveTextDocument(doc => {
        if (path.basename(doc.fileName) === 'plan.md') {
          this.saveComments(doc.uri)
        }
      })
    )

    vscode.workspace.textDocuments.forEach(doc => {
      if (path.basename(doc.fileName) === 'plan.md') {
        this.loadComments(doc.uri)
      }
    })
  }

  private getFeatureMatch(filePath: string): string | null {
    const normalized = this.normalizePath(filePath)
    const normalizedWorkspace = this.normalizedWorkspaceRoot.replace(/\/+$/, '')
    if (!normalized.startsWith(`${normalizedWorkspace}/`)) return null
    const match = normalized.match(/\.hive\/features\/([^/]+)\/(?:plan\.md|comments\.json)$/)
    return match ? match[1] : null
  }

  private normalizePath(filePath: string): string {
    const normalized = filePath.replace(/\\/g, '/')
    return process.platform === 'win32' ? normalized.toLowerCase() : normalized
  }

  private isSamePath(left: string, right: string): boolean {
    return this.normalizePath(left) === this.normalizePath(right)
  }

  private createComment(reply: vscode.CommentReply): void {
    const range = reply.thread.range ?? new vscode.Range(0, 0, 0, 0)
    
    const thread = this.controller.createCommentThread(
      reply.thread.uri,
      range,
      [{
        body: new vscode.MarkdownString(reply.text),
        author: { name: 'You' },
        mode: vscode.CommentMode.Preview
      }]
    )
    thread.canReply = true
    thread.collapsibleState = vscode.CommentThreadCollapsibleState.Expanded
    
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    this.threads.set(id, thread)
    this.saveComments(reply.thread.uri)
    
    reply.thread.dispose()
  }

  private replyToComment(reply: vscode.CommentReply): void {
    const newComment: vscode.Comment = {
      body: new vscode.MarkdownString(reply.text),
      author: { name: 'You' },
      mode: vscode.CommentMode.Preview
    }
    reply.thread.comments = [...reply.thread.comments, newComment]
    this.saveComments(reply.thread.uri)
  }

  private getCommentsPath(uri: vscode.Uri): string | null {
    const featureMatch = this.getFeatureMatch(uri.fsPath)
    if (!featureMatch) return null
    return path.join(this.workspaceRoot, '.hive', 'features', featureMatch, 'comments.json')
  }

  private loadComments(uri: vscode.Uri): void {
    const commentsPath = this.getCommentsPath(uri)
    if (!commentsPath || !fs.existsSync(commentsPath)) return

    try {
      const data: CommentsFile = JSON.parse(fs.readFileSync(commentsPath, 'utf-8'))
      
      this.threads.forEach((thread, id) => {
        if (this.isSamePath(thread.uri.fsPath, uri.fsPath)) {
          thread.dispose()
          this.threads.delete(id)
        }
      })

      for (const stored of data.threads) {
        const comments: vscode.Comment[] = [
          {
            body: new vscode.MarkdownString(stored.body),
            author: { name: 'You' },
            mode: vscode.CommentMode.Preview
          },
          ...stored.replies.map(r => ({
            body: new vscode.MarkdownString(r),
            author: { name: 'You' },
            mode: vscode.CommentMode.Preview
          }))
        ]

        const thread = this.controller.createCommentThread(
          uri,
          new vscode.Range(stored.line, 0, stored.line, 0),
          comments
        )
        thread.canReply = true
        thread.collapsibleState = vscode.CommentThreadCollapsibleState.Expanded
        
        this.threads.set(stored.id, thread)
      }
    } catch (error) {
      console.error('Failed to load comments:', error)
    }
  }

  private saveComments(uri: vscode.Uri): void {
    const commentsPath = this.getCommentsPath(uri)
    if (!commentsPath) return

    const threads: StoredThread[] = []
    
    this.threads.forEach((thread, id) => {
      if (!this.isSamePath(thread.uri.fsPath, uri.fsPath)) return
      if (thread.comments.length === 0) return

      const [first, ...rest] = thread.comments
      const line = thread.range?.start.line ?? 0
      const getBodyText = (body: string | vscode.MarkdownString): string => 
        typeof body === 'string' ? body : body.value
      threads.push({
        id,
        line,
        body: getBodyText(first.body),
        replies: rest.map(c => getBodyText(c.body))
      })
    })

    const data: CommentsFile = { threads }
    
    try {
      fs.mkdirSync(path.dirname(commentsPath), { recursive: true })
      fs.writeFileSync(commentsPath, JSON.stringify(data, null, 2))
    } catch (error) {
      console.error('Failed to save comments:', error)
    }
  }

  dispose(): void {
    this.commentsWatcher?.dispose()
    this.controller.dispose()
  }
}
