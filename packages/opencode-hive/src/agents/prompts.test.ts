import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'fs';
import * as path from 'path';
import { QUEEN_BEE_PROMPT } from './hive';
import { ARCHITECT_BEE_PROMPT } from './architect';
import { SWARM_BEE_PROMPT } from './swarm';
import { FORAGER_BEE_PROMPT } from './forager';
import { SCOUT_BEE_PROMPT } from './scout';
import { HIVE_HELPER_PROMPT } from './hive-helper';
import { HYGIENIC_BEE_PROMPT } from './hygienic';

describe('Orchestrator synthesis-before-delegation', () => {
  it('Hive prompt contains synthesis-before-delegating reminder', () => {
    expect(QUEEN_BEE_PROMPT).toContain('Synthesize Before Delegating');
    expect(QUEEN_BEE_PROMPT).toContain('Workers do not inherit your context');
  });

  it('Hive delegation check includes synthesis proof step', () => {
    expect(QUEEN_BEE_PROMPT).toContain('restate the task in concrete terms');
    expect(QUEEN_BEE_PROMPT).toContain('files, line ranges, expected outcome');
  });

  it('Swarm prompt has a dedicated synthesis section with rules', () => {
    expect(SWARM_BEE_PROMPT).toContain('## Synthesize Before Delegating');
    expect(SWARM_BEE_PROMPT).toContain('Workers do not inherit your context');
  });

  it('Swarm synthesis section forbids vague delegation phrases', () => {
    expect(SWARM_BEE_PROMPT).toContain('based on your findings');
    expect(SWARM_BEE_PROMPT).toContain('based on the research');
  });

  it('Swarm synthesis section includes good/bad delegation example', () => {
    expect(SWARM_BEE_PROMPT).toContain('<Bad>');
    expect(SWARM_BEE_PROMPT).toContain('<Good>');
  });

  it('Swarm synthesis section requires concrete hand-off anchors', () => {
    expect(SWARM_BEE_PROMPT).toContain('file paths and line ranges when known');
    expect(SWARM_BEE_PROMPT).toContain('expected result');
    expect(SWARM_BEE_PROMPT).toContain('what done looks like');
  });
});

describe('Scout operating contract', () => {
  it('enforces a read-only contract', () => {
    expect(SCOUT_BEE_PROMPT).toContain('### Read-Only Contract');
    expect(SCOUT_BEE_PROMPT).toContain('Scout must never modify project state');
  });

  it('prohibits file writes, temp files, and state-changing commands', () => {
    expect(SCOUT_BEE_PROMPT).toContain('No file edits, creation, or deletion');
    expect(SCOUT_BEE_PROMPT).toContain('No temporary files');
    expect(SCOUT_BEE_PROMPT).toContain('No state-changing shell commands');
  });

  it('defines a preferred search sequence', () => {
    expect(SCOUT_BEE_PROMPT).toContain('### Preferred Search Sequence');
    expect(SCOUT_BEE_PROMPT).toContain('Local discovery first');
    expect(SCOUT_BEE_PROMPT).toContain('Structured lookups next');
    expect(SCOUT_BEE_PROMPT).toContain('External sources when local is insufficient');
    expect(SCOUT_BEE_PROMPT).toContain('Shell as narrow fallback');
  });

  it('includes speed and efficiency rules', () => {
    expect(SCOUT_BEE_PROMPT).toContain('### Speed and Efficiency');
    expect(SCOUT_BEE_PROMPT).toContain('independent sub-parts');
    expect(SCOUT_BEE_PROMPT).toContain('answer immediately');
  });

  it('includes synthesis rules prohibiting speculation about unread files', () => {
    expect(SCOUT_BEE_PROMPT).toContain('## Synthesis Rules');
    expect(SCOUT_BEE_PROMPT).toContain('do not speculate about its contents');
    expect(SCOUT_BEE_PROMPT).toContain('cited synthesis');
  });
});

describe('Forager verification and tool-scope clarity', () => {
  it('defers tool scope to worker prompt', () => {
    expect(FORAGER_BEE_PROMPT).toContain('tool access is scoped to your role');
    expect(FORAGER_BEE_PROMPT).toContain('worker prompt');
  });

  it('records observed output in verification step', () => {
    expect(FORAGER_BEE_PROMPT).toContain('Record observed output');
    expect(FORAGER_BEE_PROMPT).toContain('do not substitute explanation for execution');
  });
});

describe('Hygienic verification routing', () => {
  it('routes verification requests to verification-reviewer skill', () => {
    expect(HYGIENIC_BEE_PROMPT).toContain('verification-reviewer');
    expect(HYGIENIC_BEE_PROMPT).toContain('hive_skill("verification-reviewer")');
  });

  it('requires falsification-first protocol for verification', () => {
    expect(HYGIENIC_BEE_PROMPT).toContain('falsification-first');
  });

  it('rejects rationalizations as evidence', () => {
    expect(HYGIENIC_BEE_PROMPT).toContain('Do NOT accept rationalizations as evidence');
  });

  it('preserves existing plan-review and code-reviewer paths', () => {
    expect(HYGIENIC_BEE_PROMPT).toContain('hive_skill("code-reviewer")');
    expect(HYGIENIC_BEE_PROMPT).toContain('Review plan WITHIN the stated approach');
  });
});

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

    it('requires hive_status() before any resume attempt', () => {
      expect(QUEEN_BEE_PROMPT).toContain('After `task()` returns, immediately call `hive_status()`');
      expect(QUEEN_BEE_PROMPT).toContain('before any resume attempt');
    });

    it('allows blocked resume only for exactly blocked tasks', () => {
      expect(QUEEN_BEE_PROMPT).toContain('Use `continueFrom: "blocked"` only when status is exactly `blocked`');
    });

    it('forbids blocked resume loops on non-blocked statuses', () => {
      expect(QUEEN_BEE_PROMPT).toContain('Never loop `continueFrom: "blocked"` on non-blocked statuses');
    });

    it('redirects non-blocked unresolved tasks to normal dispatch', () => {
      expect(QUEEN_BEE_PROMPT).toContain('If status is not `blocked`');
      expect(QUEEN_BEE_PROMPT).toContain('do not use `continueFrom: "blocked"`');
      expect(QUEEN_BEE_PROMPT).toContain('only for normal starts (`pending` / `in_progress`)');
      expect(QUEEN_BEE_PROMPT).toContain('hive_worktree_start({ feature, task })');
    });

    it('documents hygienic reviewer routing fallback and custom reviewer selection', () => {
      expect(QUEEN_BEE_PROMPT).toContain('default to built-in `hygienic-reviewer`');
      expect(QUEEN_BEE_PROMPT).toContain('its description in `Configured Custom Subagents` is a better match');
      expect(QUEEN_BEE_PROMPT).toContain('task({ subagent_type: "<chosen-reviewer>"');
    });

    it('tells hybrid planners to split broad research earlier', () => {
      expect(QUEEN_BEE_PROMPT).toContain('split broad research earlier');
    });

    it('delegates batch merges to hive-helper and keeps post-batch verification with Hive', () => {
      expect(QUEEN_BEE_PROMPT).toContain("task({ subagent_type: 'hive-helper'");
      expect(QUEEN_BEE_PROMPT).toContain('delegate the merge batch');
      expect(QUEEN_BEE_PROMPT).toContain('After the helper returns');
      expect(QUEEN_BEE_PROMPT).toContain('bun run build');
      expect(QUEEN_BEE_PROMPT).toContain('bun run test');
    });

    it('teaches Hive to delegate bounded hard-task cleanup and safe follow-up handling to hive-helper', () => {
      expect(QUEEN_BEE_PROMPT).toContain('hard-task cleanup');
      expect(QUEEN_BEE_PROMPT).toContain('interrupted wrap-up candidates');
      expect(QUEEN_BEE_PROMPT).toContain('safe append-only manual follow-up');
      expect(QUEEN_BEE_PROMPT).toContain('observably mergeable/resumable/blocked');
    });

    it('keeps DAG-changing requests routed back to Hive for plan amendment', () => {
      expect(QUEEN_BEE_PROMPT).toContain('DAG-changing');
      expect(QUEEN_BEE_PROMPT).toContain('route back to Hive');
      expect(QUEEN_BEE_PROMPT).toContain('plan amendment');
    });
  });

  describe('turn termination and hard blocks', () => {
    it('defines turn termination rules', () => {
      expect(QUEEN_BEE_PROMPT).toContain('### Turn Termination');
      expect(QUEEN_BEE_PROMPT).toContain('Valid endings');
      expect(QUEEN_BEE_PROMPT).toContain('NEVER end with');
    });

    it('separates hard blocks from anti-patterns', () => {
      expect(QUEEN_BEE_PROMPT).toContain('### Hard Blocks');
      expect(QUEEN_BEE_PROMPT).toContain('### Anti-Patterns');
    });
  });

  it('contains hard blocks section', () => {
    expect(QUEEN_BEE_PROMPT).toContain('Hard Blocks');
  });

  it('contains turn termination', () => {
    expect(QUEEN_BEE_PROMPT).toContain('Turn Termination');
  });

  it('contains docker-mastery skill reference', () => {
    expect(QUEEN_BEE_PROMPT).toContain('docker-mastery');
  });

  it('contains agents-md-mastery skill reference', () => {
    expect(QUEEN_BEE_PROMPT).toContain('agents-md-mastery');
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

    it('tells planners to split broad research earlier', () => {
      expect(ARCHITECT_BEE_PROMPT).toContain('split broad research earlier');
    });
  });

  it('contains expanded clearance checklist', () => {
    expect(ARCHITECT_BEE_PROMPT).toContain('Test strategy confirmed');
    expect(ARCHITECT_BEE_PROMPT).toContain('blocking questions outstanding');
  });

  it('contains turn termination rules', () => {
    expect(ARCHITECT_BEE_PROMPT).toContain('Turn Termination');
    expect(ARCHITECT_BEE_PROMPT).toContain('NEVER end with');
  });

  it('contains test strategy assessment', () => {
    expect(ARCHITECT_BEE_PROMPT).toContain('Test Strategy');
  });

  it('requires a human-facing summary in plan.md before tasks', () => {
    expect(ARCHITECT_BEE_PROMPT).toContain('Design Summary');
    expect(ARCHITECT_BEE_PROMPT).toContain('before `## Tasks`');
    expect(ARCHITECT_BEE_PROMPT).toContain('human-facing summary');
    expect(ARCHITECT_BEE_PROMPT).toContain('plan.md');
  });

  it('describes mermaid as optional in the plan preamble only', () => {
    expect(ARCHITECT_BEE_PROMPT).toContain('optional Mermaid');
    expect(ARCHITECT_BEE_PROMPT).toContain('dependency or sequence overview');
    expect(ARCHITECT_BEE_PROMPT).toContain('context/overview.md');
    expect(ARCHITECT_BEE_PROMPT).toContain('primary human-facing review surface');
  });

  it('teaches hive hybrid planning to keep the summary in plan.md', () => {
    expect(QUEEN_BEE_PROMPT).toContain('Design Summary');
    expect(QUEEN_BEE_PROMPT).toContain('before `## Tasks`');
    expect(QUEEN_BEE_PROMPT).toContain('optional Mermaid');
    expect(QUEEN_BEE_PROMPT).toContain('context/overview.md');
  });

  it('includes clarified context model in the hive agent', () => {
    expect(QUEEN_BEE_PROMPT).toContain('`overview` = human-facing summary/history');
    expect(QUEEN_BEE_PROMPT).toContain('`draft` = planner scratchpad');
    expect(QUEEN_BEE_PROMPT).toContain('`execution-decisions` = orchestration log');
    expect(QUEEN_BEE_PROMPT).toContain('all other names');
    expect(QUEEN_BEE_PROMPT).toContain('durable');
    expect(QUEEN_BEE_PROMPT).not.toContain('`plan.md` is the primary human-facing summary');
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

    it('requires hive_status() before any resume attempt', () => {
      expect(SWARM_BEE_PROMPT).toContain('After `task()` returns, call `hive_status()` immediately');
      expect(SWARM_BEE_PROMPT).toContain('before any resume attempt');
    });

    it('allows blocked resume only for exactly blocked tasks', () => {
      expect(SWARM_BEE_PROMPT).toContain('Use `continueFrom: "blocked"` only when status is exactly `blocked`');
    });

    it('forbids blocked resume loops on non-blocked statuses', () => {
      expect(SWARM_BEE_PROMPT).toContain('Never loop `continueFrom: "blocked"` on non-blocked statuses');
    });

    it('redirects non-blocked unresolved tasks to normal dispatch', () => {
      expect(SWARM_BEE_PROMPT).toContain('If status is not `blocked`');
      expect(SWARM_BEE_PROMPT).toContain('do not use `continueFrom: "blocked"`');
      expect(SWARM_BEE_PROMPT).toContain('only for normal starts (`pending` / `in_progress`)');
      expect(SWARM_BEE_PROMPT).toContain('hive_worktree_start({ feature, task })');
    });

    it('includes task() guidance for research fan-out', () => {
      expect(SWARM_BEE_PROMPT).toContain('task() for research fan-out');
    });

    it('documents hygienic reviewer routing fallback and custom reviewer selection', () => {
      expect(SWARM_BEE_PROMPT).toContain('default to built-in `hygienic-reviewer`');
      expect(SWARM_BEE_PROMPT).toContain('its description in `Configured Custom Subagents` is a better match');
      expect(SWARM_BEE_PROMPT).toContain('task({ subagent_type: "<chosen-reviewer>"');
    });

    it('tells orchestrators to split broad research earlier', () => {
      expect(SWARM_BEE_PROMPT).toContain('split broad research earlier');
    });

    it('delegates batch merges to hive-helper and keeps post-batch verification with Swarm', () => {
      expect(SWARM_BEE_PROMPT).toContain("task({ subagent_type: 'hive-helper'");
      expect(SWARM_BEE_PROMPT).toContain('delegate the merge batch');
      expect(SWARM_BEE_PROMPT).toContain('After the helper returns');
      expect(SWARM_BEE_PROMPT).toContain('bun run build');
      expect(SWARM_BEE_PROMPT).toContain('bun run test');
    });

    it('teaches Swarm to delegate bounded hard-task cleanup and safe follow-up handling to hive-helper', () => {
      expect(SWARM_BEE_PROMPT).toContain('hard-task cleanup');
      expect(SWARM_BEE_PROMPT).toContain('interrupted wrap-up candidates');
      expect(SWARM_BEE_PROMPT).toContain('safe append-only manual follow-up');
      expect(SWARM_BEE_PROMPT).toContain('observably mergeable/resumable/blocked');
    });

    it('keeps DAG-changing requests routed back to Swarm for plan amendment', () => {
      expect(SWARM_BEE_PROMPT).toContain('DAG-changing');
      expect(SWARM_BEE_PROMPT).toContain('route back to Swarm');
      expect(SWARM_BEE_PROMPT).toContain('plan amendment');
    });
  });

  it('does NOT contain oracle reference', () => {
    expect(SWARM_BEE_PROMPT).not.toContain('oracle');
  });

  it('contains turn termination', () => {
    expect(SWARM_BEE_PROMPT).toContain('Turn Termination');
  });

  it('contains verification checklist', () => {
    expect(SWARM_BEE_PROMPT).toContain('After Delegation - VERIFY');
  });

  it('teaches orchestrators to maintain overview at execution milestones', () => {
    expect(SWARM_BEE_PROMPT).toContain('hive_context_write({ name: "overview", content: ... })');
    expect(SWARM_BEE_PROMPT).toContain('execution start');
    expect(SWARM_BEE_PROMPT).toContain('scope shift');
    expect(SWARM_BEE_PROMPT).toContain('completion');
    expect(SWARM_BEE_PROMPT).toContain('primary human-facing document');
    expect(SWARM_BEE_PROMPT).toContain('plan.md');
  });

  it('treats reserved context names as special-purpose files', () => {
    expect(SWARM_BEE_PROMPT).toContain('reserved special-purpose files');
    expect(SWARM_BEE_PROMPT).toContain('research-*');
    expect(SWARM_BEE_PROMPT).toContain('learnings');
  });
});

describe('Forager (Worker/Coder) prompt', () => {
  it('contains resolve before blocking', () => {
    expect(FORAGER_BEE_PROMPT).toContain('Resolve Before Blocking');
    expect(FORAGER_BEE_PROMPT).toContain('tried 3');
  });

  it('contains completion checklist', () => {
    expect(FORAGER_BEE_PROMPT).toContain('Completion Checklist');
  });

  it('requires terminal commit result before stopping', () => {
    expect(FORAGER_BEE_PROMPT).toContain('ok');
    expect(FORAGER_BEE_PROMPT).toContain('terminal');
    expect(FORAGER_BEE_PROMPT).toContain('DO NOT STOP');
  });

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

  it('contains Docker Sandbox section in Iron Laws', () => {
    expect(FORAGER_BEE_PROMPT).toContain('Docker Sandbox');
  });

  it('instructs to report as blocked instead of HOST: escape', () => {
    expect(FORAGER_BEE_PROMPT).toContain('report as blocked');
    expect(FORAGER_BEE_PROMPT).not.toContain('HOST:');
  });

  it('contains docker-mastery skill reference', () => {
    expect(FORAGER_BEE_PROMPT).toContain('docker-mastery');
  });
});

describe('Hive Helper prompt', () => {
  it('forbids planning and orchestration', () => {
    expect(HIVE_HELPER_PROMPT).toContain('never plans or orchestrates');
  });

  it('uses hive_merge first and resolves preserved conflicts locally', () => {
    expect(HIVE_HELPER_PROMPT).toContain('hive_merge');
    expect(HIVE_HELPER_PROMPT).toContain("conflictState: 'preserved'");
    expect(HIVE_HELPER_PROMPT).toContain('resolves locally');
    expect(HIVE_HELPER_PROMPT).toContain('continues the merge batch');
  });

  it('requires concise summary-only output', () => {
    expect(HIVE_HELPER_PROMPT).toContain('concise');
    expect(HIVE_HELPER_PROMPT).toContain('merged/conflict/blocker summary');
  });
});

describe('Scout (Explorer/Researcher) prompt', () => {
  it('has clean persistence example', () => {
    expect(SCOUT_BEE_PROMPT).not.toContain('Worker Prompt Builder');
    expect(SCOUT_BEE_PROMPT).toContain('research-{topic}');
  });

  it('treats reserved context names as special-purpose files', () => {
    expect(SCOUT_BEE_PROMPT).toContain('reserved names like `overview`, `draft`, and `execution-decisions`');
    expect(SCOUT_BEE_PROMPT).toContain('not for general research notes');
  });

  it('covers the sharpened operating contract with structural anchors', () => {
    expect(SCOUT_BEE_PROMPT).toContain('### Read-Only Contract');
    expect(SCOUT_BEE_PROMPT).toContain('### Preferred Search Sequence');
    expect(SCOUT_BEE_PROMPT).toContain('### Speed and Efficiency');
  });

  it('protects anti-speculation and cited-synthesis guidance', () => {
    expect(SCOUT_BEE_PROMPT).toContain('## Synthesis Rules');
    expect(SCOUT_BEE_PROMPT).toContain('cited synthesis');
    expect(SCOUT_BEE_PROMPT).toContain('unverified');
  });

  it('mentions year awareness', () => {
    expect(SCOUT_BEE_PROMPT).toContain('current year');
  });

  it('limits discovery to one context window', () => {
    expect(SCOUT_BEE_PROMPT).toContain('fit in one context window');
  });

  it('teaches return-to-hive escalation', () => {
    expect(SCOUT_BEE_PROMPT).toContain('return to Hive');
  });
});

describe('Hygienic (Consultant/Reviewer) prompt', () => {
  it('contains agent-executable verification guidance', () => {
    expect(HYGIENIC_BEE_PROMPT).toContain('agent-executable');
  });

  it('contains verification examples', () => {
    expect(HYGIENIC_BEE_PROMPT).toContain('without human judgment');
  });

  it('routes implementation verification to verification-reviewer', () => {
    expect(HYGIENIC_BEE_PROMPT).toContain('verification-reviewer');
    expect(HYGIENIC_BEE_PROMPT).toContain('hive_skill("verification-reviewer")');
    expect(HYGIENIC_BEE_PROMPT).toContain('evidence-backed report format');
  });

  it('rejects rationalizations as verification evidence', () => {
    expect(HYGIENIC_BEE_PROMPT).toContain('rationalizations');
    expect(HYGIENIC_BEE_PROMPT).toContain('command output');
    expect(HYGIENIC_BEE_PROMPT).toContain('observable results');
  });
});

describe('Hive Network selective usage guidance', () => {
  it('teaches Hive to use hive_network_query only as an optional lookup with no startup lookup', () => {
    expect(QUEEN_BEE_PROMPT).toContain('hive_network_query');
    expect(QUEEN_BEE_PROMPT).toContain('optional lookup');
    expect(QUEEN_BEE_PROMPT).toContain('no startup lookup');
    expect(QUEEN_BEE_PROMPT).toContain('live-file verification still required');
  });

  it('teaches Architect to use hive_network_query selectively for planning only', () => {
    expect(ARCHITECT_BEE_PROMPT).toContain('hive_network_query');
    expect(ARCHITECT_BEE_PROMPT).toContain('optional lookup');
    expect(ARCHITECT_BEE_PROMPT).toContain('planning, orchestration, and review roles get network access first');
    expect(ARCHITECT_BEE_PROMPT).toContain('live-file verification still required');
  });

  it('teaches Swarm to use hive_network_query selectively for orchestration decisions only', () => {
    expect(SWARM_BEE_PROMPT).toContain('hive_network_query');
    expect(SWARM_BEE_PROMPT).toContain('optional lookup');
    expect(SWARM_BEE_PROMPT).toContain('no startup lookup');
    expect(SWARM_BEE_PROMPT).toContain('planning, orchestration, and review roles get network access first');
  });

  it('teaches Hygienic to treat network results as historical contrast, never authority over live repository state', () => {
    expect(HYGIENIC_BEE_PROMPT).toContain('historical contrast');
    expect(HYGIENIC_BEE_PROMPT).toContain('live repository state');
    expect(HYGIENIC_BEE_PROMPT).toContain('citations');
  });
});

describe('README.md documentation', () => {
  const README_PATH = path.resolve(import.meta.dir, '..', '..', 'README.md');
  const readmeContent = readFileSync(README_PATH, 'utf-8');
  const ROOT_README_PATH = path.resolve(import.meta.dir, '..', '..', '..', '..', 'README.md');
  const rootReadmeContent = readFileSync(ROOT_README_PATH, 'utf-8');
  const HIVE_TOOLS_PATH = path.resolve(import.meta.dir, '..', '..', 'docs', 'HIVE-TOOLS.md');
  const hiveToolsContent = readFileSync(HIVE_TOOLS_PATH, 'utf-8');
  const PHILOSOPHY_PATH = path.resolve(import.meta.dir, '..', '..', '..', '..', 'PHILOSOPHY.md');
  const philosophyContent = readFileSync(PHILOSOPHY_PATH, 'utf-8');

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

  describe('hive-helper runtime docs alignment', () => {
    it('documents hive-helper in runtime-facing recovery docs', () => {
      expect(readmeContent).toContain('`hive-helper`');
      expect(readmeContent).toContain('runtime-only');
      expect(readmeContent).toContain('merge recovery');
    });

    it('documents hive-helper in the built-in agent defaults table', () => {
      expect(readmeContent).toContain('| `hive-helper` | (none) |');
    });

    it('keeps hive-helper out of custom derived subagent docs', () => {
      expect(readmeContent).toContain('does not appear in `.github/agents/`');
      expect(readmeContent).toContain('does not appear in `packages/vscode-hive/src/generators/`');
      expect(readmeContent).toContain('### Custom Derived Subagents');
      expect(readmeContent).not.toContain('`baseAgent`: one of `forager-worker`, `hygienic-reviewer`, or `hive-helper`');
    });

    it('documents hive-helper in the top-level runtime roster and recovery notes', () => {
      expect(rootReadmeContent).toContain('**Hive Helper**');
      expect(rootReadmeContent).toContain('Runtime-only merge recovery helper');
      expect(rootReadmeContent).toContain('does not appear in generated `.github/agents/` docs');
      expect(rootReadmeContent).toContain('does not appear in `packages/vscode-hive/src/generators/`');
    });

    it('documents the expanded hive_merge contract', () => {
      expect(hiveToolsContent).toContain('preserveConflicts');
      expect(hiveToolsContent).toContain('cleanup');
      expect(hiveToolsContent).toContain('conflictState');
      expect(hiveToolsContent).toContain('worktreeRemoved');
      expect(hiveToolsContent).toContain('branchDeleted');
      expect(hiveToolsContent).toContain('pruned');
      expect(hiveToolsContent).toContain('message');
    });
  });

  describe('Hive Network docs alignment', () => {
    it('documents network access as optional and role-scoped in package docs', () => {
      expect(readmeContent).toContain('optional lookup');
      expect(readmeContent).toContain('no startup lookup');
      expect(readmeContent).toContain('planning, orchestration, and review roles get network access first');
      expect(readmeContent).toContain('live-file verification still required');
    });

    it('documents hive-helper as indirectly benefiting but not consuming network access', () => {
      expect(readmeContent).toContain('hive-helper');
      expect(readmeContent).toContain('not a network consumer');
      expect(rootReadmeContent).toContain('not a network consumer');
    });

    it('updates philosophy with the post-1.3.6 architecture narrative and network boundaries', () => {
      expect(philosophyContent).toContain('v1.3.7');
      expect(philosophyContent).toContain('#73');
      expect(philosophyContent).toContain('#74');
      expect(philosophyContent).toContain('#75');
      expect(philosophyContent).toContain('#76');
      expect(philosophyContent).toContain('read-only retrieval');
      expect(philosophyContent).toContain('planning, orchestration, and review roles get network access first');
    });
  });
});

describe('AGENTS.md tool guidance', () => {
  describe('Hive (Hybrid) prompt', () => {
    it('contains guidance to use hive_agents_md tool', () => {
      expect(QUEEN_BEE_PROMPT).toContain('hive_agents_md');
    });

    it('instructs to sync AGENTS.md after feature completion', () => {
      expect(QUEEN_BEE_PROMPT).toContain('feature completion');
      expect(QUEEN_BEE_PROMPT).toContain('sync');
    });

    it('explains the init action for bootstrapping AGENTS.md', () => {
      expect(QUEEN_BEE_PROMPT).toContain('init');
      expect(QUEEN_BEE_PROMPT).toContain('AGENTS.md');
    });
  });

  describe('Swarm (Orchestrator) prompt', () => {
    it('contains guidance to use hive_agents_md tool', () => {
      expect(SWARM_BEE_PROMPT).toContain('hive_agents_md');
    });

    it('instructs to sync AGENTS.md after batch completion', () => {
      expect(SWARM_BEE_PROMPT).toContain('batch');
      expect(SWARM_BEE_PROMPT).toContain('sync');
    });

    it('contains agents-md-mastery skill reference', () => {
      expect(SWARM_BEE_PROMPT).toContain('agents-md-mastery');
    });
  });
});

describe('trimmed OpenCode runtime prompts', () => {
  const removedProjectedTodoField = ['todo', 'Projection'].join('');
  const legacyIdleReplayPhrase = ['child-session', ' idle'].join('');

  it('removes Hive projected-todo and checkpoint rituals from the Hive prompt', () => {
    expect(QUEEN_BEE_PROMPT).not.toContain(removedProjectedTodoField);
    expect(QUEEN_BEE_PROMPT).not.toContain('todoread');
    expect(QUEEN_BEE_PROMPT).not.toContain('todowrite');
    expect(QUEEN_BEE_PROMPT).not.toContain('task checkpoints');
    expect(QUEEN_BEE_PROMPT).not.toContain(legacyIdleReplayPhrase);
  });

  it('removes planner projected-todo and checkpoint rituals from the Architect prompt', () => {
    expect(ARCHITECT_BEE_PROMPT).not.toContain(removedProjectedTodoField);
    expect(ARCHITECT_BEE_PROMPT).not.toContain('todoread');
    expect(ARCHITECT_BEE_PROMPT).not.toContain('todowrite');
    expect(ARCHITECT_BEE_PROMPT).not.toContain('task checkpoints');
    expect(ARCHITECT_BEE_PROMPT).not.toContain('task-checkpoint');
  });

  it('removes orchestration projected-todo and checkpoint rituals from the Swarm prompt', () => {
    expect(SWARM_BEE_PROMPT).not.toContain(removedProjectedTodoField);
    expect(SWARM_BEE_PROMPT).not.toContain('todoread');
    expect(SWARM_BEE_PROMPT).not.toContain('todowrite');
    expect(SWARM_BEE_PROMPT).not.toContain('task checkpoints');
    expect(SWARM_BEE_PROMPT).not.toContain('worker return/block');
  });
});
