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
  invoke: (input: T, token: unknown) => Promise<string>;
}

export function createToolResult(content: string): string {
  return content;
}
