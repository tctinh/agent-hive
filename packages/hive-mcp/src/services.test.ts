import { afterEach, describe, expect, it } from 'bun:test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { getServices } from './services';

const tempDirs: string[] = [];

function createTempDir(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hive-mcp-services-test-'));
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

describe('getServices', () => {
  it('uses the explicit root directory that is passed in', () => {
    const directory = createTempDir();

    expect(getServices(directory).directory).toBe(directory);
  });

  it('reconfigures the cached services when the root directory changes', () => {
    const firstDirectory = createTempDir();
    const secondDirectory = createTempDir();

    getServices(firstDirectory);

    expect(getServices(secondDirectory).directory).toBe(secondDirectory);
  });
});