import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'fs';
import * as path from 'path';

describe('tools template', () => {
  it('documents task vs hive mode delegation', () => {
    const toolsTemplatePath = path.resolve(
      import.meta.dir,
      '..',
      '..',
      'templates',
      'context',
      'tools.md'
    );
    const toolsTemplate = readFileSync(toolsTemplatePath, 'utf-8');

    expect(toolsTemplate).toContain('In task mode, use task()');
  });
});
