import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import type {
  HiveQueenResult,
  HiveQueenOptions,
  PanelMode,
  PlanComment,
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
  private _resolvePromise?: (result: HiveQueenResult) => void;
  private _mode: PanelMode;
  private _planContent: string;
  private _planTitle: string;
  private _closedByAgent: boolean = false;
  private _panelId: string;

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

    // Set panel HTML
    this._panel.webview.html = this._getHtmlContent();

    // Listen for panel disposal
    this._panel.onDidDispose(() => this._dispose(), null, this._disposables);

    // Handle messages from webview
    this._panel.webview.onDidReceiveMessage(
      (message: FromWebviewMessage) => this._handleMessage(message),
      null,
      this._disposables
    );

    // Send initial content after a short delay to ensure webview is ready
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
