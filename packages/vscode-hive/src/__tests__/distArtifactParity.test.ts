import { describe, expect, it } from 'bun:test';
import * as fs from 'fs';

const bundle = fs.readFileSync(new URL('../../dist/extension.js', import.meta.url), 'utf8');

describe('shipped extension artifact parity', () => {
  it('writes new plan comments to the canonical file in dist', () => {
    expect(bundle).toMatch(/return path\d+\.join\(this\.workspaceRoot, "\.hive", "features", target\.featureName, "comments", "plan\.json"\);/);
    expect(bundle).not.toMatch(/return path\d+\.join\(this\.workspaceRoot, "\\.hive", "features", target\.featureName, "comments\.json"\);/);
  });

  it('omits the removed start-task command from dist', () => {
    expect(bundle).not.toContain('registerCommand("hive.startTask"');
  });
});