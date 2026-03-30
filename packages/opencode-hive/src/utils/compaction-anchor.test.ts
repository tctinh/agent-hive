import { describe, expect, it } from 'bun:test';
import { buildCompactionReanchor } from './compaction-anchor.js';
import type { CompactionSessionContext, CompactionReanchor } from './compaction-anchor.js';

describe('buildCompactionReanchor', () => {
  describe('minimum anchor contract (all session kinds)', () => {
    const kinds: CompactionSessionContext['sessionKind'][] = [
      'primary',
      'subagent',
      'task-worker',
      'unknown',
    ];

    for (const kind of kinds) {
      describe(`sessionKind=${kind}`, () => {
        let anchor: CompactionReanchor;

        it('returns a CompactionReanchor', () => {
          anchor = buildCompactionReanchor({
            sessionKind: kind,
            agent: kind === 'primary' ? 'hive-master' :
                   kind === 'subagent' ? 'scout-researcher' :
                   kind === 'task-worker' ? 'forager-worker' :
                   undefined,
          });
          expect(anchor).toBeDefined();
          expect(typeof anchor.prompt).toBe('string');
          expect(Array.isArray(anchor.context)).toBe(true);
        });

        it('contains Compaction recovery', () => {
          anchor = buildCompactionReanchor({
            sessionKind: kind,
            agent: kind === 'primary' ? 'hive-master' : undefined,
          });
          expect(anchor.prompt).toContain('Compaction recovery');
        });

        it('contains Do not switch roles', () => {
          anchor = buildCompactionReanchor({
            sessionKind: kind,
            agent: kind === 'primary' ? 'hive-master' : undefined,
          });
          expect(anchor.prompt).toContain('Do not switch roles');
        });

        it('contains Do not re-read the full codebase', () => {
          anchor = buildCompactionReanchor({
            sessionKind: kind,
            agent: kind === 'primary' ? 'hive-master' : undefined,
          });
          expect(anchor.prompt).toContain('Do not re-read the full codebase');
        });

        it('contains explicit anti-loop guidance for status tools', () => {
          anchor = buildCompactionReanchor({
            sessionKind: kind,
            agent: kind === 'primary' ? 'hive-master' : undefined,
          });
          expect(anchor.prompt).toContain('Do not call status tools');
        });

        it('contains Next action:', () => {
          anchor = buildCompactionReanchor({
            sessionKind: kind,
            agent: kind === 'primary' ? 'hive-master' : undefined,
          });
          expect(anchor.prompt).toContain('Next action:');
        });
      });
    }
  });

  describe('primary agents', () => {
    it('anchors hive-master with Role: Hive', () => {
      const anchor = buildCompactionReanchor({
        agent: 'hive-master',
        sessionKind: 'primary',
      });
      expect(anchor.prompt).toContain('Role: Hive');
    });

    it('anchors architect-planner with Role: Architect', () => {
      const anchor = buildCompactionReanchor({
        agent: 'architect-planner',
        sessionKind: 'primary',
      });
      expect(anchor.prompt).toContain('Role: Architect');
    });

    it('anchors swarm-orchestrator with Role: Swarm', () => {
      const anchor = buildCompactionReanchor({
        agent: 'swarm-orchestrator',
        sessionKind: 'primary',
      });
      expect(anchor.prompt).toContain('Role: Swarm');
    });
  });

  describe('normal subagents', () => {
    it('anchors scout-researcher with Role: Scout', () => {
      const anchor = buildCompactionReanchor({
        agent: 'scout-researcher',
        sessionKind: 'subagent',
      });
      expect(anchor.prompt).toContain('Role: Scout');
    });

    it('anchors hygienic-reviewer with Role: Hygienic', () => {
      const anchor = buildCompactionReanchor({
        agent: 'hygienic-reviewer',
        sessionKind: 'subagent',
      });
      expect(anchor.prompt).toContain('Role: Hygienic');
    });

    it('anchors custom hygienic-reviewer derivative with Role: Hygienic', () => {
      const anchor = buildCompactionReanchor({
        agent: 'my-custom-reviewer',
        baseAgent: 'hygienic-reviewer',
        sessionKind: 'subagent',
      });
      expect(anchor.prompt).toContain('Role: Hygienic');
    });

    it('does not mention worker-prompt.md for subagents', () => {
      const anchor = buildCompactionReanchor({
        agent: 'scout-researcher',
        sessionKind: 'subagent',
      });
      expect(anchor.prompt).not.toContain('worker-prompt.md');
    });
  });

  describe('task workers', () => {
    it('anchors forager-worker with Role: Forager', () => {
      const anchor = buildCompactionReanchor({
        agent: 'forager-worker',
        sessionKind: 'task-worker',
        featureName: 'feature-a',
        taskFolder: '01-first-task',
        workerPromptPath: '.hive/features/feature-a/tasks/01-first-task/worker-prompt.md',
      });
      expect(anchor.prompt).toContain('Role: Forager');
    });

    it('tells the worker to re-read worker-prompt.md', () => {
      const anchor = buildCompactionReanchor({
        agent: 'forager-worker',
        sessionKind: 'task-worker',
        featureName: 'feature-a',
        taskFolder: '01-first-task',
        workerPromptPath: '.hive/features/feature-a/tasks/01-first-task/worker-prompt.md',
      });
      expect(anchor.prompt).toContain('Re-read worker-prompt.md now');
    });

    it('tells the worker not to delegate', () => {
      const anchor = buildCompactionReanchor({
        agent: 'forager-worker',
        sessionKind: 'task-worker',
        featureName: 'feature-a',
        taskFolder: '01-first-task',
        workerPromptPath: '.hive/features/feature-a/tasks/01-first-task/worker-prompt.md',
      });
      expect(anchor.prompt).toContain('Do not delegate');
    });

    it('without an exact path, points the worker to the Hive task path instead of the worktree root', () => {
      const anchor = buildCompactionReanchor({
        agent: 'forager-worker',
        sessionKind: 'task-worker',
        featureName: 'feature-a',
        taskFolder: '01-first-task',
      });
      expect(anchor.context.join('\n')).toContain('.hive/features/feature-a/tasks/01-first-task/worker-prompt.md');
      expect(anchor.prompt).not.toContain('task worktree root');
    });

    it('includes the worker-prompt.md path in context', () => {
      const anchor = buildCompactionReanchor({
        agent: 'forager-worker',
        sessionKind: 'task-worker',
        featureName: 'feature-a',
        taskFolder: '01-first-task',
        workerPromptPath: '.hive/features/feature-a/tasks/01-first-task/worker-prompt.md',
      });
      expect(anchor.context.join('\n')).toContain('.hive/features/feature-a/tasks/01-first-task/worker-prompt.md');
    });

    it('anchors custom forager-worker derivative with Role: Forager', () => {
      const anchor = buildCompactionReanchor({
        agent: 'my-custom-worker',
        baseAgent: 'forager-worker',
        sessionKind: 'task-worker',
        featureName: 'feature-b',
        taskFolder: '02-second-task',
        workerPromptPath: '.hive/features/feature-b/tasks/02-second-task/worker-prompt.md',
      });
      expect(anchor.prompt).toContain('Role: Forager');
      expect(anchor.prompt).toContain('Re-read worker-prompt.md now');
    });
  });

  describe('unknown sessions (safe fallback)', () => {
    it('produces a valid anchor with no session context', () => {
      const anchor = buildCompactionReanchor({});
      expect(anchor.prompt).toContain('Compaction recovery');
      expect(anchor.prompt).toContain('Do not switch roles');
      expect(anchor.prompt).toContain('Next action:');
    });

    it('does not mention worker-prompt.md for unknown sessions', () => {
      const anchor = buildCompactionReanchor({});
      expect(anchor.prompt).not.toContain('worker-prompt.md');
    });

    it('returns empty context for unknown sessions', () => {
      const anchor = buildCompactionReanchor({});
      expect(anchor.context).toEqual([]);
    });
  });

  describe('only task-worker anchors mention worker-prompt.md', () => {
    it('primary agents do not mention worker-prompt.md', () => {
      const anchor = buildCompactionReanchor({
        agent: 'hive-master',
        sessionKind: 'primary',
      });
      expect(anchor.prompt).not.toContain('worker-prompt.md');
      expect(anchor.context.join('\n')).not.toContain('worker-prompt.md');
    });

    it('subagents do not mention worker-prompt.md', () => {
      const anchor = buildCompactionReanchor({
        agent: 'hygienic-reviewer',
        sessionKind: 'subagent',
      });
      expect(anchor.prompt).not.toContain('worker-prompt.md');
      expect(anchor.context.join('\n')).not.toContain('worker-prompt.md');
    });

    it('unknown sessions do not mention worker-prompt.md', () => {
      const anchor = buildCompactionReanchor({
        sessionKind: 'unknown',
      });
      expect(anchor.prompt).not.toContain('worker-prompt.md');
      expect(anchor.context.join('\n')).not.toContain('worker-prompt.md');
    });
  });
});
