"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.HivePanelProvider = void 0;
const vscode = __importStar(require("vscode"));
class HivePanelProvider {
    constructor(extensionUri, hiveService) {
        this.extensionUri = extensionUri;
        this.hiveService = hiveService;
    }
    resolveWebviewView(webviewView) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.extensionUri]
        };
        webviewView.webview.html = this.getHtml();
        webviewView.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'openInOpenCode':
                    vscode.commands.executeCommand('hive.openInOpenCode', {
                        featureName: message.feature,
                        stepFolder: message.step
                    });
                    break;
                case 'viewDiff':
                    this.viewDiff(message.feature, message.step);
                    break;
                case 'viewReport':
                    this.viewStepReport(message.feature, message.step);
                    break;
                case 'editSpec':
                    this.editSpec(message.feature, message.step);
                    break;
                case 'revertStep':
                    this.revertStep(message.feature, message.step);
                    break;
                case 'revertBatch':
                    this.revertBatch(message.feature, message.order);
                    break;
                case 'executeBatch':
                    this.executeBatch(message.feature, message.order);
                    break;
            }
        });
    }
    viewDiff(featureName, stepFolder) {
        const diffPath = this.hiveService.getStepDiffPath(featureName, stepFolder);
        if (diffPath) {
            vscode.commands.executeCommand('hive.viewDiff', this.hiveService.getStepFilePath(featureName, stepFolder, '').replace(/\/$/, ''));
        }
        else {
            vscode.window.showInformationMessage('No diff available for this step');
        }
    }
    viewStepReport(featureName, stepFolder) {
        const reportPath = this.hiveService.getStepFilePath(featureName, stepFolder, 'report.json');
        vscode.workspace.openTextDocument(reportPath)
            .then(doc => vscode.window.showTextDocument(doc))
            .then(undefined, () => vscode.window.showInformationMessage('No report available for this step'));
    }
    editSpec(featureName, stepFolder) {
        const specPath = this.hiveService.getStepFilePath(featureName, stepFolder, 'spec.md');
        vscode.workspace.openTextDocument(specPath)
            .then(doc => vscode.window.showTextDocument(doc));
    }
    async revertStep(featureName, stepFolder) {
        const confirm = await vscode.window.showWarningMessage(`Revert step ${stepFolder}?`, { modal: true }, 'Revert');
        if (confirm === 'Revert') {
            const terminal = vscode.window.createTerminal('Hive - Revert');
            terminal.sendText(`opencode --command "hive_step_revert stepFolder=${stepFolder}"`);
            terminal.show();
        }
    }
    async revertBatch(featureName, order) {
        const confirm = await vscode.window.showWarningMessage(`Revert all steps in batch ${order}?`, { modal: true }, 'Revert Batch');
        if (confirm === 'Revert Batch') {
            const terminal = vscode.window.createTerminal('Hive - Revert Batch');
            terminal.sendText(`opencode --command "hive_batch_revert batchOrder=${order}"`);
            terminal.show();
        }
    }
    executeBatch(featureName, order) {
        const terminal = vscode.window.createTerminal('Hive - Execute');
        terminal.sendText(`opencode --command "hive execute batch ${order}"`);
        terminal.show();
    }
    showFeature(featureName) {
        if (!this._view)
            return;
        this.currentFeatureName = featureName;
        const feature = this.hiveService.getFeature(featureName);
        const batches = this.hiveService.getBatches(featureName);
        const requirements = this.hiveService.getRequirements(featureName);
        const context = this.hiveService.getContext(featureName);
        const batchesWithStats = batches.map(batch => ({
            ...batch,
            steps: batch.steps.map(step => ({
                ...step,
                duration: this.hiveService.formatDuration(step.startedAt, step.completedAt),
                report: this.hiveService.getStepReport(featureName, step.folderPath)
            }))
        }));
        this._view.webview.postMessage({
            command: 'showFeature',
            data: { feature, batches: batchesWithStats, requirements, context }
        });
    }
    getHtml() {
        return `<!DOCTYPE html>
<html>
<head>
  <style>
    body { 
      font-family: var(--vscode-font-family); 
      padding: 12px; 
      color: var(--vscode-foreground);
      font-size: 13px;
    }
    h2 { 
      margin: 0 0 16px 0; 
      font-size: 16px; 
      font-weight: 600;
    }
    .section { 
      margin-bottom: 16px; 
    }
    .section-title { 
      font-weight: bold; 
      margin-bottom: 8px; 
      text-transform: uppercase; 
      font-size: 11px; 
      opacity: 0.7; 
    }
    .section-content { 
      font-size: 12px; 
      white-space: pre-wrap;
      background: var(--vscode-textBlockQuote-background);
      padding: 8px;
      border-radius: 4px;
      max-height: 150px;
      overflow-y: auto;
    }
    .batch { 
      margin-bottom: 16px; 
    }
    .batch-header { 
      display: flex; 
      justify-content: space-between; 
      align-items: center;
      padding: 4px 0;
      border-bottom: 1px solid var(--vscode-panel-border);
      margin-bottom: 8px;
    }
    .batch-title { 
      font-size: 11px; 
      font-weight: bold; 
      text-transform: uppercase;
      opacity: 0.7;
    }
    .batch-actions { 
      display: flex; 
      gap: 4px; 
    }
    .step-card {
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 4px;
      padding: 10px 12px;
      margin-bottom: 8px;
    }
    .step-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }
    .step-name {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 500;
    }
    .step-duration {
      font-size: 11px;
      opacity: 0.7;
    }
    .step-summary {
      font-size: 12px;
      opacity: 0.8;
      margin: 4px 0;
    }
    .step-stats {
      font-size: 11px;
      opacity: 0.6;
      margin-top: 4px;
    }
    .step-footer {
      display: flex;
      justify-content: flex-end;
      gap: 4px;
      margin-top: 8px;
    }
    button { 
      background: var(--vscode-button-secondaryBackground); 
      color: var(--vscode-button-secondaryForeground); 
      border: none; 
      padding: 4px 8px; 
      cursor: pointer; 
      border-radius: 2px; 
      font-size: 11px; 
    }
    button:hover { 
      background: var(--vscode-button-secondaryHoverBackground); 
    }
    button.primary {
      background: var(--vscode-button-background); 
      color: var(--vscode-button-foreground);
    }
    button.primary:hover {
      background: var(--vscode-button-hoverBackground);
    }
    button.danger {
      background: var(--vscode-inputValidation-errorBackground);
      border: 1px solid var(--vscode-inputValidation-errorBorder);
    }
    .icon { 
      font-size: 14px; 
    }
    .empty { 
      opacity: 0.5; 
      font-style: italic; 
    }
    .pending-step {
      opacity: 0.7;
    }
    .step-edit-btn {
      background: transparent;
      opacity: 0.5;
      padding: 2px 6px;
    }
    .step-edit-btn:hover {
      opacity: 1;
      background: var(--vscode-button-secondaryBackground);
    }
  </style>
</head>
<body>
  <div id="content">
    <p class="empty">Select a feature to view details</p>
  </div>
  <script>
    const vscode = acquireVsCodeApi();
    const statusIcons = { 
      done: '\\u2705', 
      in_progress: '\\uD83D\\uDD04', 
      pending: '\\u2B1C', 
      blocked: '\\uD83D\\uDED1',
      reverted: '\\u21A9\\uFE0F',
      cancelled: '\\u274C'
    };

    window.addEventListener('message', event => {
      const { command, data } = event.data;
      if (command === 'showFeature') renderFeature(data);
    });

    function renderFeature({ feature, batches, requirements, context }) {
      const requirementsText = requirements.ticket || requirements.requirements || 'No requirements defined';
      const contextText = context.decisions || 'No decisions yet';

      let html = '<h2>' + escapeHtml(feature.name) + ' (' + feature.progress + '%)</h2>';
      
      html += '<div class="section">' +
        '<div class="section-title">Requirements</div>' +
        '<div class="section-content">' + escapeHtml(requirementsText).substring(0, 500) + '</div>' +
      '</div>';
      
      html += '<div class="section">' +
        '<div class="section-title">Context</div>' +
        '<div class="section-content">' + escapeHtml(contextText).substring(0, 500) + '</div>' +
      '</div>';

      html += '<div class="section-title">Execution</div>';
      
      for (const batch of batches) {
        html += renderBatch(feature.name, batch);
      }
      
      document.getElementById('content').innerHTML = html;
    }

    function renderBatch(featureName, batch) {
      const hasRevertButton = batch.isLatestDone;
      const hasExecuteButton = batch.canExecute;
      
      let batchActions = '';
      if (hasRevertButton) {
        batchActions = '<button class="danger" onclick="revertBatch(\\'' + featureName + '\\', ' + batch.order + ')">\\u21A9 Revert Batch</button>';
      } else if (hasExecuteButton) {
        batchActions = '<button class="primary" onclick="executeBatch(\\'' + featureName + '\\', ' + batch.order + ')">\\u25B6 Execute</button>';
      }
      
      let html = '<div class="batch">' +
        '<div class="batch-header">' +
          '<span class="batch-title">BATCH ' + batch.order + '</span>' +
          '<div class="batch-actions">' + batchActions + '</div>' +
        '</div>';
      
      for (const step of batch.steps) {
        html += renderStep(featureName, step, batch);
      }
      
      html += '</div>';
      return html;
    }

    function renderStep(featureName, step, batch) {
      const isDone = step.status === 'done';
      const isPending = step.status === 'pending';
      const icon = statusIcons[step.status] || statusIcons.pending;
      const stepClass = isPending ? 'step-card pending-step' : 'step-card';
      
      let html = '<div class="' + stepClass + '">' +
        '<div class="step-header">' +
          '<div class="step-name">' +
            '<span class="icon">' + icon + '</span>' +
            '<span>' + String(step.order).padStart(2, '0') + '-' + escapeHtml(step.name) + '</span>' +
          '</div>';
      
      if (step.duration) {
        html += '<span class="step-duration">' + step.duration + '</span>';
      }
      
      html += '</div>';
      
      if (step.summary) {
        html += '<div class="step-summary">' + escapeHtml(step.summary) + '</div>';
      }
      
      if (step.report) {
        html += '<div class="step-stats">' + 
          step.report.filesChanged + ' files (+' + step.report.insertions + ' -' + step.report.deletions + ')' +
        '</div>';
      }
      
      html += '<div class="step-footer">';
      
      if (isPending) {
        html += '<button class="step-edit-btn" onclick="editSpec(\\'' + featureName + '\\', \\'' + step.folderPath + '\\')" title="Edit Spec">\\u270F\\uFE0F Edit Spec</button>';
      }
      
      if (isDone) {
        if (batch.isLatestDone) {
          html += '<button onclick="revertStep(\\'' + featureName + '\\', \\'' + step.folderPath + '\\')" title="Revert">\\u21A9</button>';
        }
        html += '<button onclick="viewReport(\\'' + featureName + '\\', \\'' + step.folderPath + '\\')">Report</button>';
        html += '<button onclick="viewDiff(\\'' + featureName + '\\', \\'' + step.folderPath + '\\')">Diff</button>';
      } else {
        html += '<button onclick="openInOpenCode(\\'' + featureName + '\\', \\'' + step.folderPath + '\\')">Open in OpenCode</button>';
      }
      
      html += '</div></div>';
      return html;
    }

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    function openInOpenCode(feature, step) {
      vscode.postMessage({ command: 'openInOpenCode', feature, step });
    }

    function viewDiff(feature, step) {
      vscode.postMessage({ command: 'viewDiff', feature, step });
    }

    function viewReport(feature, step) {
      vscode.postMessage({ command: 'viewReport', feature, step });
    }

    function editSpec(feature, step) {
      vscode.postMessage({ command: 'editSpec', feature, step });
    }

    function revertStep(feature, step) {
      vscode.postMessage({ command: 'revertStep', feature, step });
    }

    function revertBatch(feature, order) {
      vscode.postMessage({ command: 'revertBatch', feature, order });
    }

    function executeBatch(feature, order) {
      vscode.postMessage({ command: 'executeBatch', feature, order });
    }
  </script>
</body>
</html>`;
    }
}
exports.HivePanelProvider = HivePanelProvider;
HivePanelProvider.viewType = 'hive.panel';
//# sourceMappingURL=panelProvider.js.map