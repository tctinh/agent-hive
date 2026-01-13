import * as vscode from 'vscode';
import { AskService } from 'hive-core';
import type { ToolRegistration } from './base';

function getProjectRoot(): string {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    throw new Error('No workspace folder open');
  }
  return workspaceFolders[0].uri.fsPath;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

interface AskInput {
  feature: string;
  question: string;
  timeout?: number;
}

interface ListPendingInput {
  feature: string;
}

export function getAskTools(): ToolRegistration[] {
  return [
    {
      name: 'hiveAsk',
      displayName: 'Hive Ask',
      modelDescription: 'Ask the user a question and wait for their response. Creates a blocking question that appears in the Hive Queen Panel. The agent will wait until the user answers or timeout is reached.',
      inputSchema: {
        type: 'object',
        properties: {
          feature: {
            type: 'string',
            description: 'The feature name'
          },
          question: {
            type: 'string',
            description: 'The question to ask the user'
          },
          timeout: {
            type: 'number',
            description: 'Optional timeout in seconds (default: 300, max: 600)'
          }
        },
        required: ['feature', 'question']
      },
      destructive: false,
      readOnly: true,
      invoke: async (input: AskInput, token: vscode.CancellationToken): Promise<string> => {
        const projectRoot = getProjectRoot();
        const askService = new AskService(projectRoot);
        
        const ask = askService.createAsk(input.feature, input.question);
        
        vscode.commands.executeCommand('hive.showAsk', {
          id: ask.id,
          question: ask.question,
          feature: input.feature,
          timestamp: ask.timestamp
        });

        const timeoutMs = Math.min((input.timeout || 300) * 1000, 600000);
        const pollInterval = 1000;
        const startTime = Date.now();

        while (askService.isLocked(input.feature, ask.id)) {
          if (token.isCancellationRequested) {
            askService.cleanup(input.feature, ask.id);
            return 'Question cancelled by user.';
          }

          if (Date.now() - startTime > timeoutMs) {
            askService.cleanup(input.feature, ask.id);
            return `Question timed out after ${input.timeout || 300} seconds. No answer received.`;
          }

          await sleep(pollInterval);
        }

        const answer = askService.getAnswer(input.feature, ask.id);
        
        if (answer) {
          askService.cleanup(input.feature, ask.id);
          return `User answered: ${answer.answer}`;
        }

        askService.cleanup(input.feature, ask.id);
        return 'No answer received (lock removed without answer).';
      }
    },
    {
      name: 'hiveAskListPending',
      displayName: 'Hive List Pending Asks',
      modelDescription: 'List all pending questions that are waiting for user answers.',
      inputSchema: {
        type: 'object',
        properties: {
          feature: {
            type: 'string',
            description: 'The feature name'
          }
        },
        required: ['feature']
      },
      destructive: false,
      readOnly: true,
      invoke: async (input: ListPendingInput): Promise<string> => {
        const projectRoot = getProjectRoot();
        const askService = new AskService(projectRoot);
        
        const pending = askService.listPending(input.feature);
        
        if (pending.length === 0) {
          return 'No pending questions.';
        }

        const lines = pending.map(ask => 
          `- [${ask.id}] ${ask.question} (asked at ${ask.timestamp})`
        );
        
        return `Pending questions (${pending.length}):\n${lines.join('\n')}`;
      }
    }
  ];
}
