import type { McpConfig } from './types';
import { websearchMcp } from './websearch';
import { context7Mcp } from './context7';
import { grepAppMcp } from './grep-app';
import { astGrepMcp } from './ast-grep';

const allBuiltinMcps: Record<string, McpConfig> = {
  websearch: websearchMcp,
  context7: context7Mcp,
  grep_app: grepAppMcp,
  ast_grep: astGrepMcp,
};

export const createBuiltinMcps = (disabledMcps: string[] = []): Record<string, McpConfig> => {
  const disabled = new Set(disabledMcps);
  return Object.fromEntries(
    Object.entries(allBuiltinMcps).filter(([name]) => !disabled.has(name)),
  );
};
