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
exports.HiveService = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class HiveService {
    constructor(workspaceRoot) {
        this.basePath = path.join(workspaceRoot, '.hive');
    }
    exists() {
        return fs.existsSync(this.basePath);
    }
    getFeatures() {
        const featuresPath = path.join(this.basePath, 'features');
        if (!fs.existsSync(featuresPath))
            return [];
        return fs.readdirSync(featuresPath)
            .filter(f => fs.statSync(path.join(featuresPath, f)).isDirectory())
            .map(name => this.getFeature(name));
    }
    getFeature(name) {
        const steps = this.getSteps(name);
        const activeSteps = steps.filter(s => s.status !== 'cancelled');
        const doneCount = activeSteps.filter(s => s.status === 'done').length;
        const stepsCount = activeSteps.length;
        const progress = stepsCount > 0 ? Math.round((doneCount / stepsCount) * 100) : 0;
        return { name, progress, steps, stepsCount, doneCount };
    }
    getSteps(feature) {
        const execPath = path.join(this.basePath, 'features', feature, 'execution');
        if (!fs.existsSync(execPath))
            return [];
        return fs.readdirSync(execPath)
            .filter(f => {
            const stat = fs.statSync(path.join(execPath, f));
            return stat.isDirectory();
        })
            .map(folder => {
            const folderPath = path.join(execPath, folder);
            const statusPath = path.join(folderPath, 'status.json');
            const status = this.readJson(statusPath);
            const specFiles = fs.readdirSync(folderPath)
                .filter(f => f.endsWith('.md'));
            if (!status)
                return null;
            return {
                name: status.name,
                order: status.order,
                status: status.status,
                folderPath: folder,
                specFiles,
                sessionId: status.sessionId,
                summary: status.summary,
                startedAt: status.startedAt,
                completedAt: status.completedAt,
                execution: status.execution
            };
        })
            .filter((s) => s !== null)
            .sort((a, b) => a.order - b.order);
    }
    getBatches(feature) {
        const steps = this.getSteps(feature);
        const stepsByOrder = new Map();
        for (const step of steps) {
            if (!stepsByOrder.has(step.order)) {
                stepsByOrder.set(step.order, []);
            }
            stepsByOrder.get(step.order).push(step);
        }
        const sortedOrders = Array.from(stepsByOrder.keys()).sort((a, b) => a - b);
        const result = [];
        let highestCompletedOrder = -1;
        for (const order of sortedOrders) {
            const batchSteps = stepsByOrder.get(order);
            const allDone = batchSteps.every(s => s.status === 'done');
            if (allDone) {
                highestCompletedOrder = order;
            }
        }
        let firstPendingOrder = -1;
        for (const order of sortedOrders) {
            const batchSteps = stepsByOrder.get(order);
            const allDone = batchSteps.every(s => s.status === 'done');
            if (!allDone && firstPendingOrder === -1) {
                firstPendingOrder = order;
                break;
            }
        }
        for (const order of sortedOrders) {
            const batchSteps = stepsByOrder.get(order);
            result.push({
                order,
                steps: batchSteps,
                isLatestDone: order === highestCompletedOrder,
                canExecute: order === firstPendingOrder
            });
        }
        return result;
    }
    getStepReport(feature, stepFolder) {
        const reportPath = path.join(this.basePath, 'features', feature, 'execution', stepFolder, 'report.json');
        const report = this.readJson(reportPath);
        if (!report?.diffStats)
            return null;
        return report.diffStats;
    }
    getStepDiffPath(feature, stepFolder) {
        const diffPath = path.join(this.basePath, 'features', feature, 'execution', stepFolder, 'output.diff');
        if (!fs.existsSync(diffPath))
            return null;
        return diffPath;
    }
    formatDuration(startedAt, completedAt) {
        if (!startedAt || !completedAt)
            return '';
        const start = new Date(startedAt).getTime();
        const end = new Date(completedAt).getTime();
        const seconds = Math.floor((end - start) / 1000);
        if (seconds < 60)
            return `${seconds}s`;
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        if (minutes < 60)
            return `${minutes}m ${remainingSeconds}s`;
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return `${hours}h ${remainingMinutes}m`;
    }
    getStepSpec(feature, stepFolder, specFile) {
        const specPath = path.join(this.basePath, 'features', feature, 'execution', stepFolder, specFile);
        return this.readFile(specPath);
    }
    getStepStatus(feature, stepFolder) {
        const statusPath = path.join(this.basePath, 'features', feature, 'execution', stepFolder, 'status.json');
        return this.readJson(statusPath);
    }
    getRequirements(feature) {
        let folderPath = path.join(this.basePath, 'features', feature, 'requirements');
        if (!fs.existsSync(folderPath)) {
            folderPath = path.join(this.basePath, 'features', feature, 'problem');
        }
        return {
            ticket: this.readFile(path.join(folderPath, 'ticket.md')) ?? undefined,
            requirements: this.readFile(path.join(folderPath, 'requirements.md')) ?? undefined,
            notes: this.readFile(path.join(folderPath, 'notes.md')) ?? undefined
        };
    }
    getContext(feature) {
        const contextPath = path.join(this.basePath, 'features', feature, 'context');
        return {
            decisions: this.readFile(path.join(contextPath, 'decisions.md')) ?? undefined,
            architecture: this.readFile(path.join(contextPath, 'architecture.md')) ?? undefined,
            constraints: this.readFile(path.join(contextPath, 'constraints.md')) ?? undefined
        };
    }
    getFilesInFolder(feature, folder) {
        let folderPath = path.join(this.basePath, 'features', feature, folder);
        if (!fs.existsSync(folderPath)) {
            if (folder === 'requirements') {
                folderPath = path.join(this.basePath, 'features', feature, 'problem');
            }
            else {
                return [];
            }
        }
        if (!fs.existsSync(folderPath))
            return [];
        return fs.readdirSync(folderPath).filter(f => {
            const stat = fs.statSync(path.join(folderPath, f));
            return stat.isFile();
        });
    }
    getFilePath(feature, folder, filename) {
        if (folder === 'requirements') {
            const requirementsPath = path.join(this.basePath, 'features', feature, 'requirements');
            if (fs.existsSync(requirementsPath)) {
                return path.join(requirementsPath, filename);
            }
            else {
                return path.join(this.basePath, 'features', feature, 'problem', filename);
            }
        }
        return path.join(this.basePath, 'features', feature, folder, filename);
    }
    getStepFilePath(feature, stepFolder, filename) {
        return path.join(this.basePath, 'features', feature, 'execution', stepFolder, filename);
    }
    getFeaturePath(feature) {
        return path.join(this.basePath, 'features', feature);
    }
    getReport(feature) {
        const feat = this.getFeature(feature);
        const requirements = this.getRequirements(feature);
        const context = this.getContext(feature);
        let report = `# Feature: ${feature}\n\n`;
        report += `## REQUIREMENTS\n${requirements.ticket || '(no ticket)'}\n\n`;
        report += `## CONTEXT\n`;
        if (context.decisions)
            report += context.decisions + '\n';
        if (context.architecture)
            report += context.architecture + '\n';
        if (!context.decisions && !context.architecture)
            report += '(no decisions)\n';
        report += '\n';
        report += `## EXECUTION\n`;
        for (const step of feat.steps) {
            const icon = step.status === 'done' ? '✅' : step.status === 'in_progress' ? '🔄' : '⬜';
            report += `${icon} **${step.order}. ${step.name}** (${step.status})`;
            if (step.sessionId)
                report += ` [session: ${step.sessionId}]`;
            report += '\n';
            if (step.summary)
                report += `   ${step.summary}\n`;
        }
        return report;
    }
    updateStepSession(feature, stepFolder, sessionId) {
        const statusPath = path.join(this.basePath, 'features', feature, 'execution', stepFolder, 'status.json');
        const status = this.readJson(statusPath);
        if (!status)
            return false;
        status.sessionId = sessionId;
        try {
            fs.writeFileSync(statusPath, JSON.stringify(status, null, 2));
            return true;
        }
        catch {
            return false;
        }
    }
    async getStepSessions(feature, stepFolder) {
        const status = this.getStepStatus(feature, stepFolder);
        if (!status?.sessionId)
            return [];
        const workspaceRoot = path.dirname(this.basePath);
        try {
            const { createOpencodeClient } = await import('@opencode-ai/sdk');
            const client = createOpencodeClient({ directory: workspaceRoot });
            const response = await client.session.list({ query: { directory: workspaceRoot } });
            if (response.error || !response.data)
                return [];
            const sessions = response.data;
            const parentSession = sessions.find((s) => s.id === status.sessionId);
            if (!parentSession)
                return [];
            const result = [{
                    id: parentSession.id,
                    title: parentSession.title,
                    summary: parentSession.summary ? `+${parentSession.summary.additions}/-${parentSession.summary.deletions} in ${parentSession.summary.files} files` : undefined,
                    isParent: true,
                    createdAt: parentSession.time.created,
                    updatedAt: parentSession.time.updated
                }];
            const childSessions = sessions
                .filter((s) => s.parentID === status.sessionId)
                .sort((a, b) => a.time.created - b.time.created);
            for (const child of childSessions) {
                result.push({
                    id: child.id,
                    title: child.title,
                    summary: child.summary ? `+${child.summary.additions}/-${child.summary.deletions} in ${child.summary.files} files` : undefined,
                    isParent: false,
                    createdAt: child.time.created,
                    updatedAt: child.time.updated
                });
            }
            return result;
        }
        catch {
            return [];
        }
    }
    readFile(filePath) {
        try {
            return fs.readFileSync(filePath, 'utf-8');
        }
        catch {
            return null;
        }
    }
    readJson(filePath) {
        const content = this.readFile(filePath);
        if (!content)
            return null;
        try {
            return JSON.parse(content);
        }
        catch {
            return null;
        }
    }
}
exports.HiveService = HiveService;
//# sourceMappingURL=hiveService.js.map