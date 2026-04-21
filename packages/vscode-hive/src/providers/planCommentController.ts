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

type ReviewDocument = 'plan'

interface ReviewTarget {
  featureName: string
  document: ReviewDocument
}

export class PlanCommentController {
  private controller: vscode.CommentController
  private threads = new Map<string, vscode.CommentThread>()
  private commentsWatchers: vscode.FileSystemWatcher[] = []
  private normalizedWorkspaceRoot: string

  constructor(private workspaceRoot: string) {
    this.normalizedWorkspaceRoot = this.normalizePath(workspaceRoot)
    this.controller = vscode.comments.createCommentController(
      'hive-plan-review',
      'Hive Review'
    )

    this.controller.commentingRangeProvider = {
      provideCommentingRanges: (document: vscode.TextDocument) => {
        if (!this.getReviewTarget(document.fileName)) return []
        return [new vscode.Range(0, 0, document.lineCount - 1, 0)]
      }
    }

    const patterns = [
      new vscode.RelativePattern(workspaceRoot, '.hive/features/*/comments.json'),
      new vscode.RelativePattern(workspaceRoot, '.hive/features/*/comments/plan.json')
    ]
    const rootWatcher = vscode.workspace.createFileSystemWatcher(patterns[0])
    const nestedWatcher = vscode.workspace.createFileSystemWatcher(patterns[1])
    rootWatcher.onDidChange(uri => this.onCommentsFileChanged(uri))
    rootWatcher.onDidDelete(uri => this.onCommentsFileChanged(uri))
    nestedWatcher.onDidChange(uri => this.onCommentsFileChanged(uri))
    nestedWatcher.onDidDelete(uri => this.onCommentsFileChanged(uri))
    this.commentsWatchers = [rootWatcher, nestedWatcher]
  }

  private onCommentsFileChanged(commentsUri: vscode.Uri): void {
    const target = this.getCommentsTarget(commentsUri.fsPath)
    if (!target) return
    this.loadComments(vscode.Uri.file(this.getDocumentPath(target.featureName)))
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
        if (this.getReviewTarget(doc.fileName)) {
          this.loadComments(doc.uri)
        }
      }),

      vscode.workspace.onDidSaveTextDocument(doc => {
        if (this.getReviewTarget(doc.fileName)) {
          this.saveComments(doc.uri)
        }
      })
    )

    vscode.workspace.textDocuments.forEach(doc => {
      if (this.getReviewTarget(doc.fileName)) {
        this.loadComments(doc.uri)
      }
    })
  }

  private getReviewTarget(filePath: string): ReviewTarget | null {
    const normalized = this.normalizePath(filePath)
    const normalizedWorkspace = this.normalizedWorkspaceRoot.replace(/\/+$/, '')
    const compareNormalized = process.platform === 'win32' ? normalized.toLowerCase() : normalized
    const compareWorkspace = process.platform === 'win32' ? normalizedWorkspace.toLowerCase() : normalizedWorkspace
    if (!compareNormalized.startsWith(`${compareWorkspace}/`)) return null

    const planMatch = normalized.match(/\.hive\/features\/([^/]+)\/plan\.md$/)
    if (planMatch) {
      return { featureName: planMatch[1], document: 'plan' }
    }

    return null
  }

  private getCommentsTarget(filePath: string): ReviewTarget | null {
    const normalized = this.normalizePath(filePath)
    const reviewMatch = normalized.match(/\.hive\/features\/([^/]+)\/comments\/plan\.json$/)
    if (reviewMatch) {
      return { featureName: reviewMatch[1], document: 'plan' }
    }

    const legacyMatch = normalized.match(/\.hive\/features\/([^/]+)\/comments\.json$/)
    if (legacyMatch) {
      return { featureName: legacyMatch[1], document: 'plan' }
    }

    return null
  }

  private normalizePath(filePath: string): string {
    return filePath.replace(/\\/g, '/')
  }

  private isSamePath(left: string, right: string): boolean {
    const normalizedLeft = this.normalizePath(left)
    const normalizedRight = this.normalizePath(right)
    if (process.platform === 'win32') {
      return normalizedLeft.toLowerCase() === normalizedRight.toLowerCase()
    }
    return normalizedLeft === normalizedRight
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
    const target = this.getReviewTarget(uri.fsPath)
    if (!target) return null
    return path.join(this.workspaceRoot, '.hive', 'features', target.featureName, 'comments', 'plan.json')
  }

  private getReadableCommentsPath(uri: vscode.Uri): string | null {
    const target = this.getReviewTarget(uri.fsPath)
    if (!target) return null

    const canonicalPath = path.join(this.workspaceRoot, '.hive', 'features', target.featureName, 'comments', 'plan.json')
    if (fs.existsSync(canonicalPath)) {
      return canonicalPath
    }

    const legacyPath = path.join(this.workspaceRoot, '.hive', 'features', target.featureName, 'comments.json')
    return legacyPath
  }

  private getDocumentPath(featureName: string): string {
    return path.join(this.workspaceRoot, '.hive', 'features', featureName, 'plan.md')
  }

  private loadComments(uri: vscode.Uri): void {
    const commentsPath = this.getReadableCommentsPath(uri)

    this.threads.forEach((thread, id) => {
      if (this.isSamePath(thread.uri.fsPath, uri.fsPath)) {
        thread.dispose()
        this.threads.delete(id)
      }
    })

    if (!commentsPath || !fs.existsSync(commentsPath)) return

    try {
      const data: CommentsFile = JSON.parse(fs.readFileSync(commentsPath, 'utf-8'))

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
    this.commentsWatchers.forEach(watcher => watcher.dispose())
    this.controller.dispose()
  }
}
