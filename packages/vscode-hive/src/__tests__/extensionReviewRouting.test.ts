import { describe, expect, it } from 'bun:test';
import * as fs from 'fs';

describe('extension review routing', () => {
  const source = fs.readFileSync(new URL('../extension.ts', import.meta.url), 'utf-8');

  it('keeps review-target handling scoped to plan.md', () => {
    expect(source).toContain("planMatch = normalizedPath.match(/\\.hive\\/features\\/([^/]+)\\/plan\\.md$/)");
    expect(source).not.toContain('overviewMatch');
    expect(source).not.toContain("document: 'overview'");
  });

  it('uses a plan-only error message for non-reviewable files', () => {
    expect(source).toContain('Not a reviewable plan.md file');
    expect(source).not.toContain('context/overview.md');
  });

  it('prefers canonical plan comments over the legacy fallback path', () => {
    expect(source).toContain("const canonicalPath = path.join(workspaceRoot, '.hive', 'features', featureName, 'comments', `${document}.json`)");
    expect(source).toContain("return path.join(workspaceRoot, '.hive', 'features', featureName, 'comments.json')");
  });
});