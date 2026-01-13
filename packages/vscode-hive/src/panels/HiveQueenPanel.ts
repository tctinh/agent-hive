import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { TaskService } from 'hive-core';
import type {
  HiveQueenResult,
  HiveQueenOptions,
  PanelMode,
  PlanComment,
  FileSearchResult,
  FileAttachment,
  TaskProgress,
  HiveQueenToWebviewMessage as ToWebviewMessage,
  HiveQueenFromWebviewMessage as FromWebviewMessage
} from './types';

/**
 * Hive Queen Panel - Webview for plan review and execution monitoring
 * Adapted from seamless-agent PlanReviewPanel
 */
export class HiveQueenPanel {
  public static readonly viewType = 'hive.queenPanel';

  private static _panels: Map<string, HiveQueenPanel> = new Map();
  private static _pendingResolvers: Map<string, (result: HiveQueenResult) => void> = new Map();

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];

  private _comments: PlanComment[] = [];
  private _attachments: FileAttachment[] = [];
  private _resolvePromise?: (result: HiveQueenResult) => void;
  private _mode: PanelMode;
  private _planContent: string;
  private _planTitle: string;
  private _closedByAgent: boolean = false;
  private _panelId: string;
  private _featurePath?: string;
  private _featureName?: string;
  private _projectRoot?: string;
  private _taskWatcher?: vscode.FileSystemWatcher;

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    options: HiveQueenOptions,
    resolve: (result: HiveQueenResult) => void,
    panelId: string
  ) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._resolvePromise = resolve;
    this._mode = options.mode || 'planning';
    this._comments = options.existingComments || [];
    this._planContent = options.plan;
    this._planTitle = options.title || 'Hive Queen';
    this._panelId = panelId;
    this._featurePath = options.featurePath;
    this._featureName = options.featureName;
    this._projectRoot = options.projectRoot;

    this._panel.webview.html = this._getHtmlContent();

    this._panel.onDidDispose(() => this._dispose(), null, this._disposables);

    this._panel.webview.onDidReceiveMessage(
      (message: FromWebviewMessage) => this._handleMessage(message),
      null,
      this._disposables
    );

    if (this._mode === 'execution' && this._featurePath) {
      this._startTaskWatcher();
    }

    setTimeout(() => {
      this._panel.webview.postMessage({
        type: 'showPlan',
        content: options.plan,
        title: this._planTitle,
        mode: this._mode,
        comments: this._comments
      } as ToWebviewMessage);
    }, 100);
  }

  /**
   * Show plan for review (planning mode)
   */
  public static async showPlan(
    extensionUri: vscode.Uri,
    content: string,
    title: string = 'Review Plan'
  ): Promise<HiveQueenResult> {
    return HiveQueenPanel.showWithOptions(extensionUri, {
      plan: content,
      title,
      mode: 'planning'
    });
  }

  /**
   * Show panel with full options
   */
  public static async showWithOptions(
    extensionUri: vscode.Uri,
    options: HiveQueenOptions
  ): Promise<HiveQueenResult> {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    const title = options.title || 'Hive Queen';
    const panelId = options.featureName || `hive_${Date.now()}`;

    // Check if panel already exists - if so, reveal it
    const existingPanel = HiveQueenPanel._panels.get(panelId);
    if (existingPanel && existingPanel._panel) {
      existingPanel._panel.reveal(column);
      const existingResolver = HiveQueenPanel._pendingResolvers.get(panelId);
      if (existingResolver) {
        return new Promise<HiveQueenResult>((resolve) => {
          HiveQueenPanel._pendingResolvers.set(panelId, resolve);
        });
      }
    }

    return new Promise<HiveQueenResult>((resolve) => {
      // Store the resolver globally so it survives panel close/reopen
      HiveQueenPanel._pendingResolvers.set(panelId, resolve);

      // Create a new panel
      const panel = vscode.window.createWebviewPanel(
        HiveQueenPanel.viewType,
        title,
        column || vscode.ViewColumn.One,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
          localResourceRoots: [
            vscode.Uri.joinPath(extensionUri, 'media'),
            vscode.Uri.joinPath(extensionUri, 'dist'),
            vscode.Uri.joinPath(extensionUri, 'node_modules', '@vscode', 'codicons', 'dist')
          ]
        }
      );

      const queenPanel = new HiveQueenPanel(panel, extensionUri, options, resolve, panelId);
      HiveQueenPanel._panels.set(panelId, queenPanel);

      // Clean up when panel is closed
      panel.onDidDispose(() => {
        HiveQueenPanel._panels.delete(panelId);
      });
    });
  }

  /**
   * Get a panel by ID
   */
  public static getPanel(panelId: string): HiveQueenPanel | undefined {
    return HiveQueenPanel._panels.get(panelId);
  }

  /**
   * Close a panel if it's open (used when agent cancels)
   */
  public static closeIfOpen(panelId: string): boolean {
    const panel = HiveQueenPanel._panels.get(panelId);
    if (panel) {
      panel._closedByAgent = true;
      panel._panel.dispose();
      return true;
    } else {
      const pendingResolver = HiveQueenPanel._pendingResolvers.get(panelId);
      if (pendingResolver) {
        pendingResolver({ approved: false, comments: [], action: 'closed' });
        HiveQueenPanel._pendingResolvers.delete(panelId);
        return true;
      }
    }
    return false;
  }

  /**
   * Update panel with new progress (execution mode)
   */
  public updateProgress(tasks: import('./types').TaskProgress[]): void {
    this._panel.webview.postMessage({
      type: 'updateProgress',
      tasks
    } as ToWebviewMessage);
  }

  /**
   * Show a pending ask in the panel
   */
  public showAsk(ask: import('./types').PendingAsk): void {
    this._panel.webview.postMessage({
      type: 'showAsk',
      ask
    } as ToWebviewMessage);
  }

  public setMode(mode: PanelMode): void {
    this._mode = mode;
    this._panel.webview.postMessage({
      type: 'setMode',
      mode
    } as ToWebviewMessage);

    if (mode === 'execution' && this._featurePath && !this._taskWatcher) {
      this._startTaskWatcher();
    } else if (mode === 'planning' && this._taskWatcher) {
      this._taskWatcher.dispose();
      this._taskWatcher = undefined;
    }
  }

  public get mode(): PanelMode {
    return this._mode;
  }

  private _startTaskWatcher(): void {
    if (!this._featurePath || this._taskWatcher) return;

    const tasksPattern = new vscode.RelativePattern(
      vscode.Uri.file(this._featurePath),
      'tasks/**/status.json'
    );
    this._taskWatcher = vscode.workspace.createFileSystemWatcher(tasksPattern);

    const refreshTasks = () => this._refreshTaskProgress();
    this._taskWatcher.onDidCreate(refreshTasks, null, this._disposables);
    this._taskWatcher.onDidChange(refreshTasks, null, this._disposables);
    this._taskWatcher.onDidDelete(refreshTasks, null, this._disposables);

    this._refreshTaskProgress();
  }

  private async _refreshTaskProgress(): Promise<void> {
    if (!this._featureName || !this._projectRoot) return;

    try {
      const taskService = new TaskService(this._projectRoot);
      const taskInfos = taskService.list(this._featureName);

      const tasks: TaskProgress[] = taskInfos.map(info => ({
        id: info.folder,
        name: info.name || info.folder.replace(/^\d+-/, '').replace(/-/g, ' '),
        status: this._mapTaskStatus(info.status)
      }));

      this.updateProgress(tasks);
    } catch (error) {
      console.error('Failed to refresh task progress:', error);
      this.updateProgress([]);
    }
  }

  private _mapTaskStatus(status: string): 'pending' | 'in_progress' | 'done' | 'blocked' {
    const statusMap: Record<string, 'pending' | 'in_progress' | 'done' | 'blocked'> = {
      pending: 'pending',
      in_progress: 'in_progress',
      executing: 'in_progress',
      done: 'done',
      completed: 'done',
      blocked: 'blocked'
    };
    return statusMap[status] || 'pending';
  }

  private _handleMessage(message: FromWebviewMessage): void {
    switch (message.type) {
      case 'approve':
        this._resolve({ approved: true, comments: message.comments, action: 'approved' });
        break;
      case 'reject':
        this._resolve({ approved: false, comments: message.comments, action: 'rejected', reason: message.reason });
        break;
      case 'addComment':
        this._comments.push({
          id: `comment_${Date.now()}`,
          lineNumber: message.lineNumber,
          text: message.text,
          resolved: false
        });
        this._updateComments();
        break;
      case 'editComment':
        if (message.index >= 0 && message.index < this._comments.length) {
          this._comments[message.index].text = message.text;
          this._updateComments();
        }
        break;
      case 'removeComment':
        if (message.index >= 0 && message.index < this._comments.length) {
          this._comments.splice(message.index, 1);
          this._updateComments();
        }
        break;
      case 'exportPlan':
        this._exportPlan();
        break;
      case 'searchFiles':
        this._handleSearchFiles(message.query);
        break;
      case 'addFileReference':
        this._handleAddFileReference(message.file);
        break;
      case 'removeAttachment':
        this._handleRemoveAttachment(message.attachmentId);
        break;
    }
  }

  private async _exportPlan(): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      vscode.window.showErrorMessage('No workspace folder open');
      return;
    }

    let content = `# ${this._planTitle}\n\n`;
    content += `**Mode:** ${this._mode}\n`;
    content += `**Date:** ${new Date().toLocaleString()}\n\n`;
    content += `---\n\n`;
    content += this._planContent;

    if (this._comments.length > 0) {
      content += `\n\n---\n\n## Comments\n\n`;
      for (const comment of this._comments) {
        content += `> Line ${comment.lineNumber}\n\n`;
        content += `${comment.text}\n\n`;
      }
    }

    const uri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.joinPath(workspaceFolders[0].uri, `plan-export-${Date.now()}.md`),
      filters: { 'Markdown': ['md'] }
    });

    if (uri) {
      try {
        await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf-8'));
        vscode.window.showInformationMessage(`Plan exported to ${uri.fsPath}`);
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to export plan: ${error}`);
      }
    }
  }

  private _updateComments(): void {
    this._panel.webview.postMessage({
      type: 'updateComments',
      comments: this._comments
    } as ToWebviewMessage);
  }

  private async _handleSearchFiles(query: string): Promise<void> {
    try {
      const sanitizedQuery = this._sanitizeSearchQuery(query);
      const allFiles = await vscode.workspace.findFiles('**/*', '**/node_modules/**', 2000);
      const queryLower = sanitizedQuery.toLowerCase();

      const seenFolders = new Set<string>();
      const folderResults: FileSearchResult[] = [];

      for (const uri of allFiles) {
        const relativePath = vscode.workspace.asRelativePath(uri);
        const dirPath = path.dirname(relativePath);

        if (dirPath && dirPath !== '.' && !seenFolders.has(dirPath)) {
          seenFolders.add(dirPath);
          const parts = dirPath.split(/[\\/]/);
          const folderName = parts[parts.length - 1];

          if (!queryLower || folderName.toLowerCase().includes(queryLower) || dirPath.toLowerCase().includes(queryLower)) {
            const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri)?.uri ?? vscode.workspace.workspaceFolders![0].uri;
            folderResults.push({
              name: folderName,
              path: dirPath,
              uri: vscode.Uri.joinPath(workspaceFolder, dirPath).toString(),
              icon: 'folder',
              isFolder: true
            });
          }
        }
      }

      const fileResults: FileSearchResult[] = allFiles
        .map(uri => {
          const relativePath = vscode.workspace.asRelativePath(uri);
          const fileName = uri.fsPath.split(/[\\/]/).pop() || 'file';
          return {
            name: fileName,
            path: relativePath,
            uri: uri.toString(),
            icon: this._getFileIcon(fileName),
            isFolder: false
          };
        })
        .filter(file => !queryLower || file.name.toLowerCase().includes(queryLower) || file.path.toLowerCase().includes(queryLower));

      const allResults = [...folderResults, ...fileResults]
        .sort((a, b) => {
          if (a.isFolder && !b.isFolder) return -1;
          if (!a.isFolder && b.isFolder) return 1;
          const aExact = a.name.toLowerCase().startsWith(queryLower);
          const bExact = b.name.toLowerCase().startsWith(queryLower);
          if (aExact && !bExact) return -1;
          if (!aExact && bExact) return 1;
          return a.name.localeCompare(b.name);
        })
        .slice(0, 50);

      this._panel.webview.postMessage({
        type: 'fileSearchResults',
        files: allResults
      } as ToWebviewMessage);
    } catch (error) {
      console.error('File search error:', error);
      this._panel.webview.postMessage({
        type: 'fileSearchResults',
        files: []
      } as ToWebviewMessage);
    }
  }

  private _handleAddFileReference(file: FileSearchResult): void {
    if (!file) return;
    const attachment: FileAttachment = {
      id: `${file.isFolder ? 'folder' : 'file'}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      name: file.name,
      uri: file.uri,
      isFolder: file.isFolder,
      folderPath: file.isFolder ? file.path : undefined
    };
    this._attachments.push(attachment);
    this._panel.webview.postMessage({
      type: 'updateAttachments',
      attachments: this._attachments
    } as ToWebviewMessage);
  }

  private _handleRemoveAttachment(attachmentId: string): void {
    this._attachments = this._attachments.filter(a => a.id !== attachmentId);
    this._panel.webview.postMessage({
      type: 'updateAttachments',
      attachments: this._attachments
    } as ToWebviewMessage);
  }

  private _sanitizeSearchQuery(query: string): string {
    return query
      .replace(/\.\./g, '')
      .replace(/[<>:"|?*]/g, '')
      .trim()
      .substring(0, 100);
  }

  private _getFileIcon(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const iconMap: Record<string, string> = {
      ts: 'symbol-method', tsx: 'symbol-method',
      js: 'symbol-variable', jsx: 'symbol-variable',
      json: 'json', md: 'markdown',
      html: 'code', css: 'symbol-color',
      py: 'symbol-misc', rs: 'symbol-structure',
      go: 'symbol-event', java: 'symbol-class',
      yml: 'settings-gear', yaml: 'settings-gear'
    };
    return iconMap[ext] || 'file';
  }

  private _resolve(result: HiveQueenResult): void {
    if (this._resolvePromise) {
      this._resolvePromise(result);
      this._resolvePromise = undefined;
      HiveQueenPanel._pendingResolvers.delete(this._panelId);
    }
    this._panel.dispose();
  }

  private _dispose(): void {
    if (this._resolvePromise && this._closedByAgent) {
      this._resolvePromise({ approved: false, comments: this._comments, action: 'closed' });
      this._resolvePromise = undefined;
      HiveQueenPanel._pendingResolvers.delete(this._panelId);
    }

    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }

  private _getHtmlContent(): string {
    const webview = this._panel.webview;

    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'hiveQueen.css')
    );
    const codiconsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'node_modules', '@vscode', 'codicons', 'dist', 'codicon.css')
    );
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'dist', 'hiveQueen.js')
    );

    const nonce = this._getNonce();

    // Read template file
    const templatePath = path.join(this._extensionUri.fsPath, 'media', 'hiveQueen.html');
    let template = fs.readFileSync(templatePath, 'utf8');

    // Replace placeholders
    const replacements: Record<string, string> = {
      '{{cspSource}}': webview.cspSource,
      '{{nonce}}': nonce,
      '{{styleUri}}': styleUri.toString(),
      '{{codiconsUri}}': codiconsUri.toString(),
      '{{scriptUri}}': scriptUri.toString(),
      '{{approve}}': 'Approve Plan',
      '{{reject}}': 'Request Changes',
      '{{export}}': 'Export',
      '{{addComment}}': 'Add Comment',
      '{{editComment}}': 'Edit',
      '{{removeComment}}': 'Remove',
      '{{commentPlaceholder}}': 'Enter your feedback...',
      '{{save}}': 'Save',
      '{{cancel}}': 'Cancel',
      '{{comments}}': 'Comments',
      '{{noComments}}': 'No comments yet. Hover over a line to add feedback.',
      '{{paneTitle}}': 'Hive Queen'
    };

    for (const [placeholder, value] of Object.entries(replacements)) {
      template = template.split(placeholder).join(value);
    }

    return template;
  }

  private _getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }
}
