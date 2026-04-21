import { describe, expect, it } from 'bun:test';
import * as fs from 'fs';
const source = fs.readFileSync(new URL('./plan.ts', import.meta.url), 'utf-8');

describe('getPlanTools', () => {
  it('describes plan.md as the only required review and execution document', () => {
    expect(source).toContain('only required human-review and execution document');
    expect(source).toContain('overview/design summary before ## Tasks');
    expect(source).not.toContain('context/overview.md');
    expect(source).not.toContain('hive_context_write');
  });

  it('removes overview-specific approval routing from the plan tool', () => {
    expect(source).toContain('Plan approved');
    expect(source).toContain('plan.md is the only required review document');
    expect(source).not.toContain('context/overview.md');
    expect(source).not.toContain('const hasOverview =');
    expect(source).not.toContain('overviewComments');
  });
});
