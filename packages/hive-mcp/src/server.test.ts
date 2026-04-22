import { afterEach, describe, expect, it } from 'bun:test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { getAllTools } from './server';

const tempDirs: string[] = [];

function createTempDir(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hive-mcp-server-test-'));
  tempDirs.push(directory);
  return directory;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const directory = tempDirs.pop();
    if (directory && fs.existsSync(directory)) {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  }
});

describe('getAllTools', () => {
  it('exposes canonical Hive tool names', () => {
    const toolNames = getAllTools(createTempDir()).map((tool) => tool.name);

    expect(toolNames).toContain('hive_feature_create');
    expect(toolNames).toContain('hive_plan_write');
    expect(toolNames).toContain('hive_feature_complete');
    expect(toolNames).not.toContain('hive_init');
    expect(toolNames).not.toContain('hive_plan_save');
    expect(toolNames).not.toContain('hive_complete');
  });
});