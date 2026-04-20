import { describe, expect, it } from 'bun:test';
import * as fs from 'fs';

const source = fs.readFileSync(new URL('./planCommentController.ts', import.meta.url), 'utf-8');

describe('PlanCommentController', () => {
  it('treats only plan.md as a reviewable document target', () => {
    expect(source).toContain("document: 'plan'");
    expect(source).not.toContain('context/overview.md');
    expect(source).not.toContain("document: 'overview'");
  });

  it('maps only plan comment files back to review targets', () => {
    expect(source).toContain("comments', 'plan.json");
    expect(source).toContain('comments.json');
    expect(source).not.toContain('(plan|overview)');
    expect(source).not.toContain('overview.json');
  });

  it('writes new comments to the canonical plan comments file', () => {
    expect(source).toContain("return path.join(this.workspaceRoot, '.hive', 'features', target.featureName, 'comments', 'plan.json')");
    expect(source).not.toContain("return path.join(this.workspaceRoot, '.hive', 'features', target.featureName, 'comments.json')");
  });
});