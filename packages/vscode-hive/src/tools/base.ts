import * as vscode from 'vscode';

export interface ToolInput {
  [key: string]: unknown;
}

export interface ToolRegistration<T extends ToolInput = ToolInput> {
  name: string;
  displayName: string;
  modelDescription: string;
  inputSchema: object;
  destructive?: boolean;
  readOnly?: boolean;
  invoke: (input: T, token: vscode.CancellationToken) => Promise<string>;
}

export function createToolResult(content: string): vscode.LanguageModelToolResult {
  return new vscode.LanguageModelToolResult([
    new vscode.LanguageModelTextPart(content)
  ]);
}

export function registerTool<T extends ToolInput>(
  context: vscode.ExtensionContext,
  registration: ToolRegistration<T>
): vscode.Disposable {
  const tool: vscode.LanguageModelTool<T> = {
    prepareInvocation(
      options: vscode.LanguageModelToolInvocationPrepareOptions<T>,
      _token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.PreparedToolInvocation> {
      const invocationMessage = `Executing ${registration.displayName}...`;
      
      if (registration.destructive) {
        return {
          invocationMessage,
          confirmationMessages: {
            title: registration.displayName,
            message: new vscode.MarkdownString(
              `This action will modify your project. Continue?`
            ),
          },
        };
      }

      return { invocationMessage };
    },

    async invoke(
      options: vscode.LanguageModelToolInvocationOptions<T>,
      token: vscode.CancellationToken
    ): Promise<vscode.LanguageModelToolResult> {
      try {
        const result = await registration.invoke(options.input, token);
        return createToolResult(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return createToolResult(`Error: ${message}`);
      }
    },
  };

  return vscode.lm.registerTool(registration.name, tool);
}

export function registerAllTools(
  context: vscode.ExtensionContext,
  registrations: ToolRegistration[]
): void {
  for (const reg of registrations) {
    const disposable = registerTool(context, reg);
    context.subscriptions.push(disposable);
  }
}
