import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import { spawn } from 'child_process'
import { HiveService } from './hiveService'

export type Client = 'opencode'

export class Launcher {
  private hiveService: HiveService

  constructor(private workspaceRoot: string) {
    this.hiveService = new HiveService(workspaceRoot)
  }

  async createSession(feature: string, step: string): Promise<void> {
    const specPath = path.join(
      this.workspaceRoot,
      '.hive',
      'features',
      feature,
      'execution',
      step,
      'spec.md'
    )

    if (!fs.existsSync(specPath)) {
      vscode.window.showErrorMessage(`Spec file not found: ${specPath}`)
      return
    }

    const spec = fs.readFileSync(specPath, 'utf-8')
    const prompt = this.buildStepPrompt(feature, step, spec)
    const sessionTitle = `[${feature}] ${step}`

    vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: 'Creating OpenCode session...' },
      async () => {
        const sessionId = await this.createOpencodeSession(sessionTitle, prompt)
        if (sessionId) {
          this.hiveService.updateStepSession(feature, step, sessionId)
          vscode.window.showInformationMessage(`Session created: ${sessionId}`)
        } else {
          vscode.window.showErrorMessage('Failed to create session')
        }
      }
    )
  }

  async openStep(
    client: Client,
    feature: string,
    step: string,
    sessionId?: string
  ): Promise<void> {
    return this.openInOpenCode(feature, step, sessionId)
  }

  async openFeature(client: Client, feature: string): Promise<void> {
    return this.openInOpenCode(feature)
  }

  openSession(sessionId: string): void {
    const terminal = vscode.window.createTerminal({
      name: `OpenCode - ${sessionId.slice(0, 8)}`,
      cwd: this.workspaceRoot
    })
    terminal.sendText(`opencode -s ${sessionId}`)
    terminal.show()
  }

  private async openInOpenCode(
    feature: string,
    step?: string,
    sessionId?: string
  ): Promise<void> {
    const terminalName = `OpenCode: ${feature}${step ? '/' + step : ''}`

    if (sessionId) {
      const terminal = vscode.window.createTerminal({
        name: terminalName,
        cwd: this.workspaceRoot
      })
      terminal.sendText(`opencode -s ${sessionId}`)
      terminal.show()
      return
    }

    if (step) {
      const specPath = path.join(
        this.workspaceRoot,
        '.hive',
        'features',
        feature,
        'execution',
        step,
        'spec.md'
      )

      if (fs.existsSync(specPath)) {
        const spec = fs.readFileSync(specPath, 'utf-8')
        const prompt = this.buildStepPrompt(feature, step, spec)
        const sessionTitle = `[${feature}] ${step}`

        try {
          const newSessionId = await this.createOpencodeSession(sessionTitle, prompt)
          
          if (newSessionId) {
            this.hiveService.updateStepSession(feature, step, newSessionId)
            
            const terminal = vscode.window.createTerminal({
              name: terminalName,
              cwd: this.workspaceRoot
            })
            terminal.sendText(`opencode -s ${newSessionId}`)
            terminal.show()
            return
          }
        } catch (err) {
          console.error('Failed to create opencode session:', err)
        }
      }
    }

    const terminal = vscode.window.createTerminal({
      name: terminalName,
      cwd: this.workspaceRoot
    })
    terminal.sendText('opencode')
    terminal.show()
  }

  private async createOpencodeSession(title: string, prompt: string): Promise<string | null> {
    return new Promise((resolve) => {
      const scriptPath = path.join(__dirname, '..', '..', 'scripts', 'create-session.mjs')
      const proc = spawn('node', [scriptPath, title, prompt], { cwd: this.workspaceRoot })
      
      let stdout = ''
      let stderr = ''
      
      proc.stdout.on('data', (data) => { stdout += data.toString() })
      proc.stderr.on('data', (data) => { stderr += data.toString() })
      
      proc.on('close', (code) => {
        if (code === 0 && stdout.trim()) {
          resolve(stdout.trim())
        } else {
          console.error('create-session failed:', stderr)
          resolve(null)
        }
      })
      
      proc.on('error', (err) => {
        console.error('create-session spawn error:', err)
        resolve(null)
      })
    })
  }

  private buildStepPrompt(feature: string, step: string, spec: string): string {
    return `You are working on step "${step}" of feature "${feature}".

## Step Specification
${spec}

## Context
- Feature: ${feature}
- Step: ${step}
- Read the full feature context at: .hive/features/${feature}/

Begin by acknowledging this step and asking any clarifying questions.`
  }
}
