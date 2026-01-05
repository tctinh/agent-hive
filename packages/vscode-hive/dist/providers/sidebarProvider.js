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
exports.HiveSidebarProvider = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
function classifyFeatureStatus(feature) {
    if (feature.stepsCount === 0)
        return 'pending';
    if (feature.doneCount === 0)
        return 'pending';
    if (feature.doneCount === feature.stepsCount)
        return 'completed';
    return 'in_progress';
}
class FeatureStatusGroupItem extends vscode.TreeItem {
    constructor(status, features) {
        const labels = { completed: 'COMPLETED', in_progress: 'IN-PROGRESS', pending: 'PENDING' };
        const icons = { completed: 'pass-filled', in_progress: 'sync~spin', pending: 'circle-outline' };
        super(labels[status], features.length > 0 ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None);
        this.status = status;
        this.features = features;
        this.contextValue = 'featureStatusGroup';
        this.iconPath = new vscode.ThemeIcon(icons[status]);
        this.description = `${features.length}`;
    }
}
class FeatureItem extends vscode.TreeItem {
    constructor(feature) {
        super(feature.name, vscode.TreeItemCollapsibleState.Expanded);
        this.feature = feature;
        this.featureName = feature.name;
        this.description = `${feature.progress}% (${feature.doneCount}/${feature.stepsCount})`;
        this.contextValue = 'feature';
        this.iconPath = new vscode.ThemeIcon('package');
        this.command = {
            command: 'hive.showFeature',
            title: 'Show Feature Details',
            arguments: [feature.name]
        };
    }
}
class FolderItem extends vscode.TreeItem {
    constructor(label, featureName, folder, icon, hasChildren) {
        super(label, hasChildren ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None);
        this.featureName = featureName;
        this.folder = folder;
        this.contextValue = 'folder';
        this.iconPath = new vscode.ThemeIcon(icon);
    }
}
class FileItem extends vscode.TreeItem {
    constructor(filename, featureName, folder, filePath) {
        super(filename, vscode.TreeItemCollapsibleState.None);
        this.filename = filename;
        this.featureName = featureName;
        this.folder = folder;
        this.filePath = filePath;
        this.contextValue = 'file';
        this.iconPath = new vscode.ThemeIcon(filename.endsWith('.md') ? 'markdown' : 'file');
        this.command = {
            command: 'vscode.open',
            title: 'Open File',
            arguments: [vscode.Uri.file(filePath)]
        };
        this.resourceUri = vscode.Uri.file(filePath);
    }
}
class ExecutionItem extends vscode.TreeItem {
    constructor(feature) {
        super('Execution', vscode.TreeItemCollapsibleState.Expanded);
        this.feature = feature;
        this.contextValue = 'execution';
        this.iconPath = new vscode.ThemeIcon('run-all');
    }
}
class StepItem extends vscode.TreeItem {
    constructor(featureName, step, hasSpecFiles) {
        const canRevert = step.status === 'done' && step.execution?.canRevert === true;
        const label = `${String(step.order).padStart(2, '0')}-${step.name}${canRevert ? ' ⟲' : ''}`;
        super(label, (hasSpecFiles || step.sessionId || step.status === 'done') ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None);
        this.featureName = featureName;
        this.step = step;
        this.stepName = step.name;
        this.stepFolder = step.folderPath;
        this.sessionId = step.sessionId;
        this.canRevert = canRevert;
        this.contextValue = canRevert ? 'stepWithRevert' : (step.sessionId ? 'step' : 'stepNoSession');
        this.iconPath = new vscode.ThemeIcon(StepItem.statusIcons[step.status] || 'circle-outline');
        if (step.summary) {
            this.description = step.summary;
        }
        if (step.sessionId) {
            this.tooltip = `Session: ${step.sessionId}`;
        }
        else if (canRevert) {
            this.tooltip = 'Can be reverted';
        }
    }
}
StepItem.statusIcons = {
    done: 'pass',
    in_progress: 'sync~spin',
    pending: 'circle-outline',
    blocked: 'error'
};
class SpecFileItem extends vscode.TreeItem {
    constructor(filename, featureName, stepFolder, filePath) {
        super(filename, vscode.TreeItemCollapsibleState.None);
        this.filename = filename;
        this.featureName = featureName;
        this.stepFolder = stepFolder;
        this.filePath = filePath;
        this.contextValue = 'specFile';
        this.iconPath = new vscode.ThemeIcon('markdown');
        this.command = {
            command: 'vscode.open',
            title: 'Open Spec',
            arguments: [vscode.Uri.file(filePath)]
        };
        this.resourceUri = vscode.Uri.file(filePath);
    }
}
class ReportFileItem extends vscode.TreeItem {
    constructor(featureName, stepFolder, filePath) {
        super('report.json', vscode.TreeItemCollapsibleState.None);
        this.featureName = featureName;
        this.stepFolder = stepFolder;
        this.filePath = filePath;
        this.contextValue = 'reportFile';
        this.iconPath = new vscode.ThemeIcon('file-json');
        this.command = {
            command: 'vscode.open',
            title: 'Open Report',
            arguments: [vscode.Uri.file(filePath)]
        };
        this.resourceUri = vscode.Uri.file(filePath);
    }
}
class DiffFileItem extends vscode.TreeItem {
    constructor(featureName, stepFolder, filePath) {
        super('output.diff', vscode.TreeItemCollapsibleState.None);
        this.featureName = featureName;
        this.stepFolder = stepFolder;
        this.filePath = filePath;
        this.contextValue = 'diffFile';
        this.iconPath = new vscode.ThemeIcon('file-code');
        this.command = {
            command: 'hive.viewDiff',
            title: 'View Diff',
            arguments: [vscode.Uri.file(filePath)]
        };
        this.resourceUri = vscode.Uri.file(filePath);
    }
}
class SessionTreeItem extends vscode.TreeItem {
    constructor(featureName, stepFolder, session) {
        super(session.title || session.id, vscode.TreeItemCollapsibleState.None);
        this.featureName = featureName;
        this.stepFolder = stepFolder;
        this.session = session;
        this.contextValue = 'session';
        this.iconPath = this.getIcon();
        this.description = session.isParent ? 'main' : this.parseAgentType();
        if (session.summary) {
            this.tooltip = session.summary;
        }
    }
    parseAgentType() {
        const match = this.session.title?.match(/@(\w+)\s+subagent/);
        return match?.[1];
    }
    getIcon() {
        if (this.session.isParent)
            return new vscode.ThemeIcon('circle-filled');
        const agent = this.parseAgentType();
        switch (agent) {
            case 'explore': return new vscode.ThemeIcon('search');
            case 'librarian': return new vscode.ThemeIcon('book');
            case 'general': return new vscode.ThemeIcon('hubot');
            case 'oracle': return new vscode.ThemeIcon('lightbulb');
            default: return new vscode.ThemeIcon('terminal');
        }
    }
}
class HiveSidebarProvider {
    constructor(hiveService) {
        this.hiveService = hiveService;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    }
    refresh() {
        this._onDidChangeTreeData.fire(undefined);
    }
    getTreeItem(element) {
        return element;
    }
    async getChildren(element) {
        if (!element) {
            const features = this.hiveService.getFeatures();
            const grouped = { in_progress: [], pending: [], completed: [] };
            for (const f of features) {
                grouped[classifyFeatureStatus(f)].push(f);
            }
            // Sort by completion % (descending for in_progress, ascending for pending)
            grouped.in_progress.sort((a, b) => b.progress - a.progress);
            grouped.pending.sort((a, b) => a.progress - b.progress);
            grouped.completed.sort((a, b) => b.progress - a.progress);
            const result = [];
            // Order: IN-PROGRESS, PENDING, COMPLETED
            if (grouped.in_progress.length > 0)
                result.push(new FeatureStatusGroupItem('in_progress', grouped.in_progress));
            if (grouped.pending.length > 0)
                result.push(new FeatureStatusGroupItem('pending', grouped.pending));
            if (grouped.completed.length > 0)
                result.push(new FeatureStatusGroupItem('completed', grouped.completed));
            return result;
        }
        if (element instanceof FeatureStatusGroupItem) {
            return element.features.map(f => new FeatureItem(f));
        }
        if (element instanceof FeatureItem) {
            const requirementsFiles = this.hiveService.getFilesInFolder(element.feature.name, 'requirements');
            const contextFiles = this.hiveService.getFilesInFolder(element.feature.name, 'context');
            return [
                new FolderItem('Requirements', element.feature.name, 'requirements', 'question', requirementsFiles.length > 0),
                new FolderItem('Context', element.feature.name, 'context', 'lightbulb', contextFiles.length > 0),
                new ExecutionItem(element.feature)
            ];
        }
        if (element instanceof FolderItem) {
            const files = this.hiveService.getFilesInFolder(element.featureName, element.folder);
            return files.map(f => new FileItem(f, element.featureName, element.folder, this.hiveService.getFilePath(element.featureName, element.folder, f)));
        }
        if (element instanceof ExecutionItem) {
            return element.feature.steps.map(s => new StepItem(element.feature.name, s, s.specFiles.length > 0));
        }
        if (element instanceof StepItem) {
            const step = this.hiveService.getFeature(element.featureName).steps.find(s => s.folderPath === element.stepFolder);
            if (!step)
                return [];
            const children = [];
            const stepPath = path.join(this.hiveService['basePath'], 'features', element.featureName, 'execution', element.stepFolder);
            children.push(...step.specFiles.map(f => new SpecFileItem(f, element.featureName, element.stepFolder, this.hiveService.getStepFilePath(element.featureName, element.stepFolder, f))));
            const reportPath = path.join(stepPath, 'report.json');
            if (fs.existsSync(reportPath)) {
                children.push(new ReportFileItem(element.featureName, element.stepFolder, reportPath));
            }
            const diffPath = path.join(stepPath, 'output.diff');
            if (fs.existsSync(diffPath)) {
                children.push(new DiffFileItem(element.featureName, element.stepFolder, diffPath));
            }
            if (element.sessionId) {
                const sessions = await this.hiveService.getStepSessions(element.featureName, element.stepFolder);
                children.push(...sessions.map(s => new SessionTreeItem(element.featureName, element.stepFolder, s)));
            }
            return children;
        }
        return [];
    }
}
exports.HiveSidebarProvider = HiveSidebarProvider;
//# sourceMappingURL=sidebarProvider.js.map