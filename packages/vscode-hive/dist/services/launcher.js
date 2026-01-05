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
exports.Launcher = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const child_process_1 = require("child_process");
const hiveService_1 = require("./hiveService");
class Launcher {
    constructor(workspaceRoot) {
        this.workspaceRoot = workspaceRoot;
        this.hiveService = new hiveService_1.HiveService(workspaceRoot);
    }
    async createSession(feature, step) {
        const specPath = path.join(this.workspaceRoot, '.hive', 'features', feature, 'execution', step, 'spec.md');
        if (!fs.existsSync(specPath)) {
            vscode.window.showErrorMessage(`Spec file not found: ${specPath}`);
            return;
        }
        const spec = fs.readFileSync(specPath, 'utf-8');
        const prompt = this.buildStepPrompt(feature, step, spec);
        const sessionTitle = `[${feature}] ${step}`;
        vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'Creating OpenCode session...' }, async () => {
            const sessionId = await this.createOpencodeSession(sessionTitle, prompt);
            if (sessionId) {
                this.hiveService.updateStepSession(feature, step, sessionId);
                vscode.window.showInformationMessage(`Session created: ${sessionId}`);
            }
            else {
                vscode.window.showErrorMessage('Failed to create session');
            }
        });
    }
    async openStep(client, feature, step, sessionId) {
        return this.openInOpenCode(feature, step, sessionId);
    }
    async openFeature(client, feature) {
        return this.openInOpenCode(feature);
    }
    openSession(sessionId) {
        const terminal = vscode.window.createTerminal({
            name: `OpenCode - ${sessionId.slice(0, 8)}`,
            cwd: this.workspaceRoot
        });
        terminal.sendText(`opencode -s ${sessionId}`);
        terminal.show();
    }
    async openInOpenCode(feature, step, sessionId) {
        const terminalName = `OpenCode: ${feature}${step ? '/' + step : ''}`;
        if (sessionId) {
            const terminal = vscode.window.createTerminal({
                name: terminalName,
                cwd: this.workspaceRoot
            });
            terminal.sendText(`opencode -s ${sessionId}`);
            terminal.show();
            return;
        }
        if (step) {
            const specPath = path.join(this.workspaceRoot, '.hive', 'features', feature, 'execution', step, 'spec.md');
            if (fs.existsSync(specPath)) {
                const spec = fs.readFileSync(specPath, 'utf-8');
                const prompt = this.buildStepPrompt(feature, step, spec);
                const sessionTitle = `[${feature}] ${step}`;
                try {
                    const newSessionId = await this.createOpencodeSession(sessionTitle, prompt);
                    if (newSessionId) {
                        this.hiveService.updateStepSession(feature, step, newSessionId);
                        const terminal = vscode.window.createTerminal({
                            name: terminalName,
                            cwd: this.workspaceRoot
                        });
                        terminal.sendText(`opencode -s ${newSessionId}`);
                        terminal.show();
                        return;
                    }
                }
                catch (err) {
                    console.error('Failed to create opencode session:', err);
                }
            }
        }
        const terminal = vscode.window.createTerminal({
            name: terminalName,
            cwd: this.workspaceRoot
        });
        terminal.sendText('opencode');
        terminal.show();
    }
    async createOpencodeSession(title, prompt) {
        return new Promise((resolve) => {
            const scriptPath = path.join(__dirname, '..', '..', 'scripts', 'create-session.mjs');
            const proc = (0, child_process_1.spawn)('node', [scriptPath, title, prompt], { cwd: this.workspaceRoot });
            let stdout = '';
            let stderr = '';
            proc.stdout.on('data', (data) => { stdout += data.toString(); });
            proc.stderr.on('data', (data) => { stderr += data.toString(); });
            proc.on('close', (code) => {
                if (code === 0 && stdout.trim()) {
                    resolve(stdout.trim());
                }
                else {
                    console.error('create-session failed:', stderr);
                    resolve(null);
                }
            });
            proc.on('error', (err) => {
                console.error('create-session spawn error:', err);
                resolve(null);
            });
        });
    }
    buildStepPrompt(feature, step, spec) {
        return `You are working on step "${step}" of feature "${feature}".

## Step Specification
${spec}

## Context
- Feature: ${feature}
- Step: ${step}
- Read the full feature context at: .hive/features/${feature}/

Begin by acknowledging this step and asking any clarifying questions.`;
    }
}
exports.Launcher = Launcher;
//# sourceMappingURL=launcher.js.map