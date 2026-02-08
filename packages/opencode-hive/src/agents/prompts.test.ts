import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'fs';
import * as path from 'path';
import { QUEEN_BEE_PROMPT } from './hive';
import { ARCHITECT_BEE_PROMPT } from './architect';
import { SWARM_BEE_PROMPT } from './swarm';
import { FORAGER_BEE_PROMPT } from './forager';

describe('Hive (Hybrid) prompt', () => {
  describe('delegation planning alignment', () => {
    it('contains the Canonical Delegation Threshold block', () => {
      expect(QUEEN_BEE_PROMPT).toContain('### Canonical Delegation Threshold');
      expect(QUEEN_BEE_PROMPT).toContain('cannot name the file path upfront');
      expect(QUEEN_BEE_PROMPT).toContain('expect to inspect 2+ files');
      expect(QUEEN_BEE_PROMPT).toContain('open-ended');
      expect(QUEEN_BEE_PROMPT).toContain('Local `read/grep/glob`');
    });

    it('contains read-only exploration is allowed', () => {
      expect(QUEEN_BEE_PROMPT).toContain('Read-only exploration is allowed');
    });

    it('does NOT contain the old planning iron law "Don\'t execute - plan only"', () => {
      expect(QUEEN_BEE_PROMPT).not.toContain("- Don't execute - plan only");
    });

    it('explains task() is BLOCKING', () => {
      expect(QUEEN_BEE_PROMPT).toContain('BLOCKING');
      expect(QUEEN_BEE_PROMPT).toContain('returns when done');
    });

    it('includes internal codebase exploration in Research intent', () => {
      expect(QUEEN_BEE_PROMPT).toContain('Internal codebase exploration');
    });

    it('includes task() guidance for research', () => {
      expect(QUEEN_BEE_PROMPT).toContain('task(');
      expect(QUEEN_BEE_PROMPT).toContain('scout-researcher');
    });
  });
});

describe('Architect (Planner) prompt', () => {
  describe('delegation planning alignment', () => {
    it('allows read-only research delegation to Scout', () => {
      expect(ARCHITECT_BEE_PROMPT).toContain('read-only research delegation to Scout is allowed');
    });

    it('permits research and review delegation via task()', () => {
      expect(ARCHITECT_BEE_PROMPT).toContain('You may use task() to delegate read-only research to Scout and plan review to Hygienic.');
      expect(ARCHITECT_BEE_PROMPT).toContain('Never use task() to delegate implementation or coding work.');
    });

    it('does NOT contain the blanket prohibition "Delegate work or spawn workers"', () => {
      expect(ARCHITECT_BEE_PROMPT).not.toContain('Delegate work or spawn workers');
    });

    it('contains the Canonical Delegation Threshold block', () => {
      expect(ARCHITECT_BEE_PROMPT).toContain('### Canonical Delegation Threshold');
      expect(ARCHITECT_BEE_PROMPT).toContain('cannot name the file path upfront');
      expect(ARCHITECT_BEE_PROMPT).toContain('expect to inspect 2+ files');
      expect(ARCHITECT_BEE_PROMPT).toContain('open-ended');
      expect(ARCHITECT_BEE_PROMPT).toContain('Local `read/grep/glob`');
    });

    it('broadens research to include internal repo exploration', () => {
      expect(ARCHITECT_BEE_PROMPT).toContain('internal codebase');
    });
  });
});

describe('Swarm (Orchestrator) prompt', () => {
  describe('delegation planning alignment', () => {
    it('does NOT contain "Cancel background tasks before completion"', () => {
      expect(SWARM_BEE_PROMPT).not.toContain('Cancel background tasks before completion');
    });

    it('contains the replacement cancel rule about stale tasks', () => {
      expect(SWARM_BEE_PROMPT).toContain('Cancel background tasks only when stale or no longer needed');
    });

    it('explains task() is BLOCKING for delegation', () => {
      expect(SWARM_BEE_PROMPT).toContain('BLOCKING');
      expect(SWARM_BEE_PROMPT).toContain('returns when');
    });

    it('tells to check hive_status() after task() returns', () => {
      expect(SWARM_BEE_PROMPT).toContain('hive_status()');
    });

    it('includes task() guidance for research fan-out', () => {
      expect(SWARM_BEE_PROMPT).toContain('task() for research fan-out');
    });
  });
});

describe('Forager (Worker/Coder) prompt', () => {
  it('adds resolve-before-blocking guidance', () => {
    expect(FORAGER_BEE_PROMPT).toContain('## Resolve Before Blocking');
    expect(FORAGER_BEE_PROMPT).toContain('Default to exploration, questions are LAST resort');
    expect(FORAGER_BEE_PROMPT).toContain('Context inference: Before asking "what does X do?", READ X first.');
  });

  it('adds a completion checklist before reporting done', () => {
    expect(FORAGER_BEE_PROMPT).toContain('## Completion Checklist');
    expect(FORAGER_BEE_PROMPT).toContain('Record exact commands and results');
  });

  it('expands the orient step with explicit pre-flight actions', () => {
    expect(FORAGER_BEE_PROMPT).toContain('Read the referenced files and surrounding code');
    expect(FORAGER_BEE_PROMPT).toContain('Search for similar patterns in the codebase');
  });
});

describe('README.md documentation', () => {
  const README_PATH = path.resolve(import.meta.dir, '..', '..', 'README.md');
  const readmeContent = readFileSync(README_PATH, 'utf-8');

  describe('delegation planning alignment', () => {
    it('contains the heading "### Planning-mode delegation"', () => {
      expect(readmeContent).toContain('### Planning-mode delegation');
    });

    it('explains task() delegation model', () => {
      expect(readmeContent).toContain('Delegate to Scout');
      expect(readmeContent).toContain('Read-only exploration');
    });

    it('clarifies that "don\'t execute" means "don\'t implement"', () => {
      expect(readmeContent).toContain("don't implement");
    });

    it('contains the Canonical Delegation Threshold content', () => {
      expect(readmeContent).toContain('cannot name the file path upfront');
      expect(readmeContent).toContain('2+ files');
    });
  });
});
