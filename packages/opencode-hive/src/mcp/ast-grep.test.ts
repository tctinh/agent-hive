import { describe, expect, it } from 'bun:test';
import { astGrepMcp } from './ast-grep.js';

describe('ast-grep MCP config', () => {
  it('launches the official ast-grep MCP via bundled uv', () => {
    expect(astGrepMcp.type).toBe('local');
    expect(astGrepMcp.command[0]).toContain('@manzt/uv');
    expect(astGrepMcp.command[1]).toBe('tool');
    expect(astGrepMcp.command[2]).toBe('run');
    expect(astGrepMcp.command[3]).toBe('--from');
    expect(astGrepMcp.command[4]).toBe('git+https://github.com/ast-grep/ast-grep-mcp');
    expect(astGrepMcp.command[5]).toBe('ast-grep-server');
    expect(astGrepMcp.environment?.PATH).toContain('@ast-grep/cli-');
  });
});
