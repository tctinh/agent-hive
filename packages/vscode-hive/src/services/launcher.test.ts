import { describe, expect, it } from 'bun:test';
import * as fs from 'fs';
const source = fs.readFileSync(new URL('./launcher.ts', import.meta.url), 'utf-8');

describe('Launcher', () => {
  it('opens plan.md even when overview.md is present', () => {
    expect(source).toContain('const targetPath = planPath');
    expect(source).not.toContain('fs.existsSync(overviewPath) ? overviewPath : planPath');
    expect(source).not.toContain("fs.existsSync(overviewPath) ? 'overview' : 'plan'");
  });

  it('warns about a missing plan without mentioning overview review flow', () => {
    expect(source).toContain('No plan found for feature');
    expect(source).not.toContain('No overview or plan found');
  });
});