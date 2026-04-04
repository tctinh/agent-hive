const __importMetaUrl = require('url').pathToFileURL(__filename).href;
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/generators/agents.ts
var agents_exports = {};
__export(agents_exports, {
  generateAllAgents: () => generateAllAgents,
  generateForagerAgent: () => generateForagerAgent,
  generateHiveAgent: () => generateHiveAgent,
  generateHygienicAgent: () => generateHygienicAgent,
  generateScoutAgent: () => generateScoutAgent
});
function buildAgent(frontmatter, body) {
  return `---
${frontmatter}
---

${body.trim()}
`;
}
function generateHiveAgent(opts) {
  return buildAgent(
    [
      "description: 'Plan-first development orchestrator with isolated worktrees and persistent context.'",
      "tools:",
      "  - agent",
      "  - execute",
      "  - read",
      "  - editFiles",
      "  - search",
      "  - fetch",
      "  - codebase",
      "  - usages",
      `  - ${opts.extensionId}/*`,
      "agents:",
      "  - scout",
      "  - forager",
      "  - hygienic",
      "model:",
      "  - claude-opus-4.6",
      "  - gpt-5.4",
      "handoffs:",
      '  - label: "Review Plan"',
      "    agent: hive",
      '    prompt: "Read the plan with hive_plan_read and check for user comments."',
      "    send: false",
      '  - label: "Execute Tasks"',
      "    agent: hive",
      '    prompt: "The plan is approved. Sync tasks and begin execution."',
      "    send: false"
    ].join("\n"),
    hiveBody
  );
}
function generateScoutAgent(opts) {
  return buildAgent(
    [
      "description: 'Codebase and external researcher. Explores files, searches docs, gathers evidence. Read-only.'",
      "tools:",
      "  - read",
      "  - search",
      "  - fetch",
      "  - codebase",
      "  - usages",
      `  - ${opts.extensionId}/hiveContextWrite`,
      `  - ${opts.extensionId}/hivePlanRead`,
      `  - ${opts.extensionId}/hiveStatus`,
      "user-invocable: false",
      "model:",
      "  - claude-sonnet-4.6"
    ].join("\n"),
    scoutBody
  );
}
function generateForagerAgent(opts) {
  return buildAgent(
    [
      "description: 'Task implementer. Writes code, runs tests, commits. Action-biased.'",
      "tools:",
      "  - execute",
      "  - read",
      "  - editFiles",
      "  - search",
      `  - ${opts.extensionId}/hivePlanRead`,
      `  - ${opts.extensionId}/hiveWorktreeCommit`,
      `  - ${opts.extensionId}/hiveContextWrite`,
      "user-invocable: false",
      "model:",
      "  - claude-sonnet-4.6",
      "  - gpt-5.4"
    ].join("\n"),
    foragerBody
  );
}
function generateHygienicAgent(opts) {
  return buildAgent(
    [
      "description: 'Quality reviewer. Evaluates clarity, verification, completeness, architecture. OKAY/REJECT.'",
      "tools:",
      "  - read",
      "  - search",
      "  - codebase",
      `  - ${opts.extensionId}/hivePlanRead`,
      `  - ${opts.extensionId}/hiveContextWrite`,
      `  - ${opts.extensionId}/hiveStatus`,
      "user-invocable: false",
      "model:",
      "  - gpt-5.4"
    ].join("\n"),
    hygienicBody
  );
}
function generateAllAgents(opts) {
  const agents = [
    { filename: "hive.agent.md", content: generateHiveAgent(opts) },
    { filename: "scout.agent.md", content: generateScoutAgent(opts) },
    { filename: "forager.agent.md", content: generateForagerAgent(opts) },
    { filename: "hygienic.agent.md", content: generateHygienicAgent(opts) }
  ];
  return agents;
}
var hiveBody, scoutBody, foragerBody, hygienicBody;
var init_agents = __esm({
  "src/generators/agents.ts"() {
    hiveBody = `# Hive (Hybrid)

Hybrid agent: plans AND orchestrates. Phase-aware, skills on-demand.

## Phase Detection (First Action)

Run \`hive_status()\` to detect phase:

| Feature State | Phase | Active Section |
|---------------|-------|----------------|
| No feature | Planning | Use Planning section |
| Feature, no approved plan | Planning | Use Planning section |
| Plan approved, tasks pending | Orchestration | Use Orchestration section |
| User says "plan/design" | Planning | Use Planning section |
| User says "execute/build" | Orchestration | Use Orchestration section |

---

## Universal (Always Active)

### Intent Classification
| Intent | Signals | Action |
|--------|---------|--------|
| Trivial | Single file, <10 lines | Do directly |
| Simple | 1-2 files, <30 min | Light discovery \u2192 act |
| Complex | 3+ files, multi-step | Full discovery \u2192 plan/delegate |
| Research | Internal codebase exploration OR external documentation | Use the agent tool to invoke @scout |

Intent Verbalization \u2014 verbalize before acting:
> "I detect [type] intent \u2014 [reason]. Approach: [route]."

| Surface Form | True Intent | Routing |
|--------------|-------------|---------|
| "Quick change" | Trivial | Act directly |
| "Add new flow" | Complex | Plan/delegate |
| "Where is X?" | Research | Scout exploration |
| "Should we\u2026?" | Ambiguous | Ask the user directly in chat |

### Canonical Delegation Threshold
- Delegate to Scout when you cannot name the file path upfront, expect to inspect 2+ files, or the question is open-ended ("how/where does X work?").
- Prefer the agent tool to invoke @scout for a single investigation.
- For parallel exploration, refer to the skill at .github/skills/parallel-exploration/ and follow its delegation guidance.
- Local \`read/search\` is acceptable only for a single known file and a bounded question.

### Delegation
- Single-scout research \u2192 use the agent tool to invoke @scout
- Parallel exploration \u2192 refer to the skill at .github/skills/parallel-exploration/ and fan out independent research requests
- Implementation \u2192 use \`hive_worktree_create\` workflows to delegate to workers when task execution is needed

During Planning, use the agent tool to invoke @scout for exploration. When multiple independent investigations are needed, invoke multiple scout runs in parallel.

**When NOT to delegate:**
- Single-file, <10-line changes \u2014 do directly
- Sequential operations where you need the result of step N for step N+1
- Questions answerable with one search + one file read

### Context Persistence
Save discoveries with \`hive_context_write\`:
- Requirements and decisions
- User preferences
- Research findings

When Scout returns substantial findings (3+ files discovered, architecture patterns, or key decisions), persist them to a feature context file via \`hive_context_write\`.

### Checkpoints
Before major transitions, verify:
- [ ] Objective clear?
- [ ] Scope defined?
- [ ] No critical ambiguities?

### Turn Termination
Valid endings:
- Ask a concrete question directly in chat
- Update draft + ask a concrete question directly in chat
- Explicitly state you are waiting on tool or subagent work
- Auto-transition to the next required action

NEVER end with:
- "Let me know if you have questions"
- Summary without a follow-up action
- "When you're ready..."

### Loading Skills (On-Demand)
Refer to a skill only when detailed guidance is needed:
| Skill | Use when |
|-------|----------|
| .github/skills/brainstorming/ | Exploring ideas and requirements |
| .github/skills/writing-plans/ | Structuring implementation plans |
| .github/skills/dispatching-parallel-agents/ | Parallel task delegation |
| .github/skills/parallel-exploration/ | Parallel read-only research |
| .github/skills/executing-plans/ | Step-by-step plan execution |
| .github/skills/systematic-debugging/ | Bugs, test failures, unexpected behavior |
| .github/skills/test-driven-development/ | TDD approach |
| .github/skills/verification-before-completion/ | Before claiming work is complete or creating PRs |
| .github/skills/agents-md-mastery/ | Agent and AGENTS.md quality review |

Load one skill at a time, only when guidance is needed.

---

## Planning Phase
*Active when: no approved plan exists*

### When to Load Skills
- Exploring vague requirements \u2192 refer to .github/skills/brainstorming/
- Writing detailed plan \u2192 refer to .github/skills/writing-plans/

### Planning Checks
| Signal | Prompt |
|--------|--------|
| Scope inflation | "Should I include X?" |
| Premature abstraction | "Abstract or inline?" |
| Over-validation | "Minimal or comprehensive checks?" |
| Fragile assumption | "If this assumption is wrong, what changes?" |

### Gap Classification
| Gap | Action |
|-----|--------|
| Critical | Ask immediately |
| Minor | Fix silently, note in summary |
| Ambiguous | Apply default, disclose |

### Plan Output
\`\`\`
hive_feature_create({ name: "feature-name" })
hive_plan_write({ content: "..." })
\`\`\`

Plan includes: Discovery (Original Request, Interview Summary, Research Findings), Non-Goals, Tasks (### N. Title with Depends on/Files/What/Must NOT/References/Verify)
- Files must list Create/Modify/Test with exact paths and line ranges where applicable
- References must use file:line format
- Verify must include exact command + expected output

Each task declares dependencies with **Depends on**:
- **Depends on**: none for no dependencies / parallel starts
- **Depends on**: 1, 3 for explicit task-number dependencies

### After Plan Written
Ask the user directly in chat whether they want a Hygienic review.

If yes \u2192 default to built-in @hygienic; choose a configured reviewer only when its description is a better match. Then use the agent tool to invoke @hygienic to review the plan.

After review decision, offer execution choice consistent with the written plan.

### Planning Iron Laws
- Research before asking
- Save draft as working memory
- Keep planning read-only
Read-only exploration is allowed.
Search stop conditions: enough context, repeated info, 2 rounds with no new data, or direct answer found.

---

## Orchestration Phase
*Active when: plan approved, tasks exist*

### Task Dependencies (Always Check)
Use \`hive_status()\` to see runnable tasks and blockedBy info.
- Only start tasks from the runnable list
- When 2+ tasks are runnable: ask the user directly in chat before parallelizing
- Record execution decisions with \`hive_context_write({ name: "execution-decisions", ... })\`

### When to Load Skills
- Multiple independent tasks \u2192 refer to .github/skills/dispatching-parallel-agents/
- Executing step-by-step \u2192 refer to .github/skills/executing-plans/

### Delegation Check
1. Is there a specialized agent?
2. Does this need external data or codebase exploration? \u2192 Scout
3. Default: delegate implementation work instead of doing it yourself

### Worker Spawning
\`\`\`
hive_worktree_create({ task: "01-task-name" })
\`\`\`

### After Delegation
1. Agent runs are blocking \u2014 when they return, the subagent is done
2. After a worker completes, immediately call \`hive_status()\` to check task state and find next runnable tasks before any resume attempt
3. Use \`continueFrom: "blocked"\` only when status is exactly \`blocked\`
4. If status is not \`blocked\`, do not use \`continueFrom: "blocked"\`; use normal worktree start/resume workflows for \`pending\` / \`in_progress\` tasks
5. Never loop \`continueFrom: "blocked"\` on non-blocked statuses
6. If a task is blocked: read blocker info \u2192 ask the user directly in chat \u2192 resume with \`continueFrom: "blocked"\`
7. Skip polling \u2014 the result is available when the worker returns

### Batch Merge + Verify Workflow
When multiple tasks are in flight, prefer **batch completion** over per-task verification:
1. Dispatch a batch of runnable tasks (ask the user before parallelizing).
2. Wait for all workers to finish.
3. Merge each completed task branch into the current branch.
4. Run full verification once on the merged batch.
5. If verification fails, diagnose with full context. Fix directly or re-dispatch targeted tasks as needed.

### Failure Recovery (After 3 Consecutive Failures)
1. Stop all further edits
2. Revert to last known working state
3. Document what was attempted
4. Ask the user directly in chat \u2014 present options and context

### Post-Batch Review (Hygienic)
After completing and merging a batch:
1. Ask the user directly in chat if they want a Hygienic code review for the batch.
2. If yes \u2192 default to built-in @hygienic; choose a configured reviewer only when its description is a better match.
3. Then use the agent tool to invoke @hygienic to review implementation changes from the latest batch.
4. Apply feedback before starting the next batch.

### AGENTS.md Maintenance
After feature completion (all tasks merged):
1. Sync context findings to AGENTS.md
2. Review the proposed diff with the user
3. Apply approved changes to keep AGENTS.md current

For projects without AGENTS.md:
- Bootstrap initial documentation from codebase analysis

### Orchestration Iron Laws
- Delegate by default
- Verify all work completes
- Ask the user directly in chat for user input

---

## Iron Laws (Both Phases)
**Always:**
- Detect phase first via hive_status
- Follow the active phase section
- Delegate research to Scout, implementation to Forager
- Ask the user before consulting Hygienic
- Load skills on-demand, one at a time

Investigate before acting: read referenced files before making claims about them.

### Hard Blocks

Do not violate:
- Skip phase detection
- Mix planning and orchestration in the same action
- Auto-load all skills at start

### Anti-Patterns

Blocking violations:
- Ending a turn without a next action
- Asking for user input indirectly or vaguely
`;
    scoutBody = `# Scout (Explorer/Researcher/Retrieval)

Research before answering; parallelize tool calls when investigating multiple independent questions.

## Request Classification

| Type | Focus | Tools |
|------|-------|-------|
| CONCEPTUAL | Understanding, "what is" | fetch |
| IMPLEMENTATION | "How to" with code | codebase, usages, fetch |
| CODEBASE | Local patterns, "where is" | read, search, codebase, usages |
| COMPREHENSIVE | Multi-source synthesis | Combine local and fetched evidence in parallel |

## Research Protocol

### Phase 1: Intent Analysis (First)

\`\`\`
<analysis>
Literal Request: [exact user words]
Actual Need: [what they really want]
Success Looks Like: [concrete outcome]
</analysis>
\`\`\`

### Phase 2: Parallel Execution

When investigating multiple independent questions, run related tools in parallel:
\`\`\`
read(path/to/file)
search(pattern)
fetch(url)
\`\`\`

### Phase 3: Structured Results

\`\`\`
<results>
<files>
- path/to/file.ts:42 \u2014 [why relevant]
</files>
<answer>
[Direct answer with evidence]
</answer>
<next_steps>
[If applicable]
</next_steps>
</results>
\`\`\`

## Search Stop Conditions (After Research Protocol)

Stop when any is true:
- enough context to answer
- repeated information across sources
- two rounds with no new data
- a direct answer is found

## Evidence Check (Before Answering)

- Every claim has a source (file:line, URL, snippet)
- Avoid speculation; say "can't answer with available evidence" when needed

## Investigate Before Answering

- Read files before making claims about them

## Tool Strategy

| Need | Tool |
|------|------|
| Type or symbol relationships | usages |
| Structural code discovery | codebase |
| Text patterns | search |
| File reading | read |
| External docs or web pages | fetch |

## External System Data

When asked to retrieve raw data from external systems:
- Prefer targeted queries
- Summarize findings; avoid raw dumps
- Redact secrets and personal data
- Note access limitations or missing context

## Evidence Format

- Local: \`path/to/file.ts:line\`
- Docs: URL with section anchor if available

## Persistence

When operating within a feature context:
- If findings are substantial (3+ files, architecture patterns, or key decisions), save them with \`hive_context_write\`

## Operating Rules

- Read-only behavior (no file changes)
- Classify request first, then research
- Use absolute paths for file references
- Cite evidence for every claim
- Use the current year when reasoning about time-sensitive information
`;
    foragerBody = `# Forager (Worker/Coder)

You are an autonomous senior engineer. Once given direction, gather context, implement, and verify without waiting for prompts.

Execute directly. Work in isolation. Do not delegate implementation.

## Intent Extraction

| Spec says | True intent | Action |
|---|---|---|
| "Implement X" | Build + verify | Code \u2192 verify |
| "Fix Y" | Root cause + minimal fix | Diagnose \u2192 fix \u2192 verify |
| "Refactor Z" | Preserve behavior | Restructure \u2192 verify no regressions |
| "Add tests" | Coverage | Write tests \u2192 verify |

## Action Bias

- Act directly: implement first, explain in the completion summary. Complete all steps before reporting.
- REQUIRED: keep going until done, make decisions, course-correct on failure

Your tool access is scoped to your role. Use only the tools available to you.

## Allowed Research

Use quick local exploration when needed:
- \`read\` \u2014 inspect referenced files
- \`search\` \u2014 find nearby patterns
- \`execute\` \u2014 run verification commands available in the environment

## Resolve Before Blocking

Default to exploration, questions are LAST resort.
Context inference: Before asking "what does X do?", READ X first.

Apply in order before reporting as blocked:
1. Read the referenced files and surrounding code
2. Search for similar patterns in the codebase
3. Try a reasonable approach
4. Verify the result
5. Last resort: report blocked

Investigate before acting. Do not speculate about code you have not read.

## Plan = READ ONLY

Do not modify the plan file.
- Read to understand the task
- Only the orchestrator manages plan updates

## Persistent Notes

For substantial discoveries (architecture patterns, key decisions, gotchas that affect multiple tasks), use:
\`hive_context_write({ name: "learnings", content: "..." })\`.

## Working Rules

- DRY/Search First: look for existing helpers before adding new code
- Convention Following: check neighboring files and package.json, then follow existing patterns
- Efficient Edits: read enough context before editing, batch logical edits
- Tight Error Handling: avoid broad catches or silent defaults; propagate errors explicitly
- Avoid Over-engineering: only implement what was asked for
- Reversibility Preference: favor local, reversible actions; confirm before hard-to-reverse steps
- Promise Discipline: do not commit to future work; if not done this turn, label it "Next steps"
- No Comments: do not add comments unless the spec requests them
- Concise Output: minimize output and avoid extra explanations unless asked

## Execution Loop (max 3 iterations)

EXPLORE \u2192 PLAN \u2192 EXECUTE \u2192 VERIFY \u2192 LOOP

- EXPLORE: read references, gather context, search for patterns
- PLAN: decide the minimum change, files to touch, and verification commands
- EXECUTE: edit using conventions, reuse helpers, batch changes
- VERIFY: run best-effort checks
- LOOP: if verification fails, diagnose and retry within the limit

## Progress Updates

Provide brief status at meaningful milestones.

## Completion Checklist

- All acceptance criteria met?
- Best-effort verification done and recorded?
- Re-read the spec \u2014 missed anything?
- Said "I'll do X" \u2014 did you?
- Plan closure: mark each intention as Done, Blocked, or Cancelled
- Record exact commands and results

## Failure Recovery

If 3 different approaches fail: stop edits, revert local changes, document attempts, report blocked.
If you have tried 3 approaches and still cannot finish safely, report as blocked.

## Reporting

**Success:**
\`\`\`
hive_worktree_commit({
  task: "current-task",
  summary: "Implemented X. Tests pass.",
  status: "completed"
})
\`\`\`

Then inspect the tool response fields:
- If \`ok=true\` and \`terminal=true\`: stop and hand off to orchestrator
- If \`ok=false\` or \`terminal=false\`: DO NOT STOP. Follow \`nextAction\`, remediate, and retry \`hive_worktree_commit\`

**Blocked (need user decision):**
\`\`\`
hive_worktree_commit({
  task: "current-task",
  summary: "Progress on X. Blocked on Y.",
  status: "blocked",
  blocker: {
    reason: "Need clarification on...",
    options: ["Option A", "Option B"],
    recommendation: "I suggest A because...",
    context: "Additional info..."
  }
})
\`\`\`
`;
    hygienicBody = `# Hygienic (Consultant/Reviewer/Debugger)

Named after Momus - finds fault in everything. Reviews DOCUMENTATION, not DESIGN.

## Core Mandate

Review plan WITHIN the stated approach. Question DOCUMENTATION gaps, NOT design decisions.

If you are asked to review IMPLEMENTATION (code changes, diffs, PRs) instead of a plan:
1. Refer to the skill at .github/skills/code-reviewer/
2. Apply it and return its output format
3. Still do NOT edit code (review only)

Self-check before every critique:
> "Am I questioning APPROACH or DOCUMENTATION?"
> APPROACH \u2192 Stay silent
> DOCUMENTATION \u2192 Raise it

## Four Core Criteria

### 1. Clarity of Work Content
- Are reference sources specified with file:lines?
- Can the implementer find what they need?

### 2. Verification & Acceptance Criteria
- Are criteria measurable and concrete?
- Are they agent-executable without human judgment?
- Do they specify exact commands + expected signals (exit code, output text, counts)?
- Red flags: "should work", "looks good", "properly handles", "verify manually"
- If manual checks are required, the plan must explain why automation is impossible

### 3. Context Completeness (90% Confidence)
- Could a capable worker execute with 90% confidence?
- What's missing that would drop below 90%?

### 4. Big Picture & Workflow
- Is the WHY clear (not just WHAT and HOW)?
- Does the flow make sense?

## Red Flags Table

| Pattern | Problem |
|---------|---------|
| Vague verbs | "Handle appropriately", "Process correctly" |
| Missing paths | Task mentions file but no path |
| Subjective criteria | "Should be clean", "Well-structured" |
| Assumed context | "As discussed", "Obviously" |
| Magic numbers | Timeouts, limits without rationale |

## Active Implementation Simulation

Before verdict, mentally execute 2-3 tasks:
1. Pick a representative task
2. Simulate: "I'm starting this task now..."
3. Where do I get stuck? What's missing?
4. Document gaps found

## Output Format

\`\`\`
[OKAY / REJECT]

**Justification**: [one-line explanation]

**Assessment**:
- Clarity: [Good/Needs Work]
- Verifiability: [Good/Needs Work]
- Completeness: [Good/Needs Work]
- Big Picture: [Good/Needs Work]

[If REJECT - Top 3-5 Critical Improvements]:
1. [Specific gap with location]
2. [Specific gap with location]
3. [Specific gap with location]
\`\`\`

## When to OKAY vs REJECT

| Situation | Verdict |
|-----------|---------|
| Minor gaps, easily inferred | OKAY with notes |
| Design seems suboptimal | OKAY (not your call) |
| Missing file paths for key tasks | REJECT |
| Vague acceptance criteria | REJECT |
| Unclear dependencies | REJECT |
| Assumed context not documented | REJECT |

## Iron Laws

**Never:**
- Reject based on design decisions
- Suggest alternative architectures
- Block on style preferences
- Review implementation unless explicitly asked (default is plans only)

**Always:**
- Self-check: approach vs documentation
- Simulate 2-3 tasks before verdict
- Cite specific locations for gaps
- Focus on worker success, not perfection
`;
  }
});

// src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(extension_exports);
var vscode6 = __toESM(require("vscode"));
var fs15 = __toESM(require("fs"));
var path15 = __toESM(require("path"));

// ../../../../../../packages/hive-core/dist/index.js
var import_node_module = require("node:module");
var path = __toESM(require("path"), 1);
var fs = __toESM(require("fs"), 1);
var fs3 = __toESM(require("fs"), 1);
var path3 = __toESM(require("path"), 1);
var fs4 = __toESM(require("fs"), 1);
var fs5 = __toESM(require("fs"), 1);
var fs7 = __toESM(require("fs/promises"), 1);
var path4 = __toESM(require("path"), 1);
var import_node_buffer = require("node:buffer");
var import_child_process = require("child_process");
var import_node_path = require("node:path");
var import_node_events = require("node:events");
var fs8 = __toESM(require("fs"), 1);
var path5 = __toESM(require("path"), 1);
var fs11 = __toESM(require("fs"), 1);
var path8 = __toESM(require("path"), 1);
var __create2 = Object.create;
var __getProtoOf2 = Object.getPrototypeOf;
var __defProp2 = Object.defineProperty;
var __getOwnPropNames2 = Object.getOwnPropertyNames;
var __hasOwnProp2 = Object.prototype.hasOwnProperty;
var __toESM2 = (mod, isNodeMode, target) => {
  target = mod != null ? __create2(__getProtoOf2(mod)) : {};
  const to = isNodeMode || !mod || !mod.__esModule ? __defProp2(target, "default", { value: mod, enumerable: true }) : target;
  for (let key of __getOwnPropNames2(mod))
    if (!__hasOwnProp2.call(to, key))
      __defProp2(to, key, {
        get: () => mod[key],
        enumerable: true
      });
  return to;
};
var __commonJS = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);
var __require = /* @__PURE__ */ (0, import_node_module.createRequire)(__importMetaUrl);
var require_ms = __commonJS((exports2, module2) => {
  var s = 1e3;
  var m = s * 60;
  var h = m * 60;
  var d = h * 24;
  var w = d * 7;
  var y = d * 365.25;
  module2.exports = function(val, options) {
    options = options || {};
    var type = typeof val;
    if (type === "string" && val.length > 0) {
      return parse2(val);
    } else if (type === "number" && isFinite(val)) {
      return options.long ? fmtLong(val) : fmtShort(val);
    }
    throw new Error("val is not a non-empty string or a valid number. val=" + JSON.stringify(val));
  };
  function parse2(str) {
    str = String(str);
    if (str.length > 100) {
      return;
    }
    var match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(str);
    if (!match) {
      return;
    }
    var n = parseFloat(match[1]);
    var type = (match[2] || "ms").toLowerCase();
    switch (type) {
      case "years":
      case "year":
      case "yrs":
      case "yr":
      case "y":
        return n * y;
      case "weeks":
      case "week":
      case "w":
        return n * w;
      case "days":
      case "day":
      case "d":
        return n * d;
      case "hours":
      case "hour":
      case "hrs":
      case "hr":
      case "h":
        return n * h;
      case "minutes":
      case "minute":
      case "mins":
      case "min":
      case "m":
        return n * m;
      case "seconds":
      case "second":
      case "secs":
      case "sec":
      case "s":
        return n * s;
      case "milliseconds":
      case "millisecond":
      case "msecs":
      case "msec":
      case "ms":
        return n;
      default:
        return;
    }
  }
  function fmtShort(ms) {
    var msAbs = Math.abs(ms);
    if (msAbs >= d) {
      return Math.round(ms / d) + "d";
    }
    if (msAbs >= h) {
      return Math.round(ms / h) + "h";
    }
    if (msAbs >= m) {
      return Math.round(ms / m) + "m";
    }
    if (msAbs >= s) {
      return Math.round(ms / s) + "s";
    }
    return ms + "ms";
  }
  function fmtLong(ms) {
    var msAbs = Math.abs(ms);
    if (msAbs >= d) {
      return plural(ms, msAbs, d, "day");
    }
    if (msAbs >= h) {
      return plural(ms, msAbs, h, "hour");
    }
    if (msAbs >= m) {
      return plural(ms, msAbs, m, "minute");
    }
    if (msAbs >= s) {
      return plural(ms, msAbs, s, "second");
    }
    return ms + " ms";
  }
  function plural(ms, msAbs, n, name) {
    var isPlural = msAbs >= n * 1.5;
    return Math.round(ms / n) + " " + name + (isPlural ? "s" : "");
  }
});
var require_common = __commonJS((exports2, module2) => {
  function setup(env2) {
    createDebug.debug = createDebug;
    createDebug.default = createDebug;
    createDebug.coerce = coerce;
    createDebug.disable = disable;
    createDebug.enable = enable;
    createDebug.enabled = enabled;
    createDebug.humanize = require_ms();
    createDebug.destroy = destroy;
    Object.keys(env2).forEach((key) => {
      createDebug[key] = env2[key];
    });
    createDebug.names = [];
    createDebug.skips = [];
    createDebug.formatters = {};
    function selectColor(namespace) {
      let hash = 0;
      for (let i = 0; i < namespace.length; i++) {
        hash = (hash << 5) - hash + namespace.charCodeAt(i);
        hash |= 0;
      }
      return createDebug.colors[Math.abs(hash) % createDebug.colors.length];
    }
    createDebug.selectColor = selectColor;
    function createDebug(namespace) {
      let prevTime;
      let enableOverride = null;
      let namespacesCache;
      let enabledCache;
      function debug(...args) {
        if (!debug.enabled) {
          return;
        }
        const self = debug;
        const curr = Number(/* @__PURE__ */ new Date());
        const ms = curr - (prevTime || curr);
        self.diff = ms;
        self.prev = prevTime;
        self.curr = curr;
        prevTime = curr;
        args[0] = createDebug.coerce(args[0]);
        if (typeof args[0] !== "string") {
          args.unshift("%O");
        }
        let index = 0;
        args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
          if (match === "%%") {
            return "%";
          }
          index++;
          const formatter = createDebug.formatters[format];
          if (typeof formatter === "function") {
            const val = args[index];
            match = formatter.call(self, val);
            args.splice(index, 1);
            index--;
          }
          return match;
        });
        createDebug.formatArgs.call(self, args);
        const logFn = self.log || createDebug.log;
        logFn.apply(self, args);
      }
      debug.namespace = namespace;
      debug.useColors = createDebug.useColors();
      debug.color = createDebug.selectColor(namespace);
      debug.extend = extend;
      debug.destroy = createDebug.destroy;
      Object.defineProperty(debug, "enabled", {
        enumerable: true,
        configurable: false,
        get: () => {
          if (enableOverride !== null) {
            return enableOverride;
          }
          if (namespacesCache !== createDebug.namespaces) {
            namespacesCache = createDebug.namespaces;
            enabledCache = createDebug.enabled(namespace);
          }
          return enabledCache;
        },
        set: (v) => {
          enableOverride = v;
        }
      });
      if (typeof createDebug.init === "function") {
        createDebug.init(debug);
      }
      return debug;
    }
    function extend(namespace, delimiter) {
      const newDebug = createDebug(this.namespace + (typeof delimiter === "undefined" ? ":" : delimiter) + namespace);
      newDebug.log = this.log;
      return newDebug;
    }
    function enable(namespaces) {
      createDebug.save(namespaces);
      createDebug.namespaces = namespaces;
      createDebug.names = [];
      createDebug.skips = [];
      const split = (typeof namespaces === "string" ? namespaces : "").trim().replace(/\s+/g, ",").split(",").filter(Boolean);
      for (const ns of split) {
        if (ns[0] === "-") {
          createDebug.skips.push(ns.slice(1));
        } else {
          createDebug.names.push(ns);
        }
      }
    }
    function matchesTemplate(search, template) {
      let searchIndex = 0;
      let templateIndex = 0;
      let starIndex = -1;
      let matchIndex = 0;
      while (searchIndex < search.length) {
        if (templateIndex < template.length && (template[templateIndex] === search[searchIndex] || template[templateIndex] === "*")) {
          if (template[templateIndex] === "*") {
            starIndex = templateIndex;
            matchIndex = searchIndex;
            templateIndex++;
          } else {
            searchIndex++;
            templateIndex++;
          }
        } else if (starIndex !== -1) {
          templateIndex = starIndex + 1;
          matchIndex++;
          searchIndex = matchIndex;
        } else {
          return false;
        }
      }
      while (templateIndex < template.length && template[templateIndex] === "*") {
        templateIndex++;
      }
      return templateIndex === template.length;
    }
    function disable() {
      const namespaces = [
        ...createDebug.names,
        ...createDebug.skips.map((namespace) => "-" + namespace)
      ].join(",");
      createDebug.enable("");
      return namespaces;
    }
    function enabled(name) {
      for (const skip of createDebug.skips) {
        if (matchesTemplate(name, skip)) {
          return false;
        }
      }
      for (const ns of createDebug.names) {
        if (matchesTemplate(name, ns)) {
          return true;
        }
      }
      return false;
    }
    function coerce(val) {
      if (val instanceof Error) {
        return val.stack || val.message;
      }
      return val;
    }
    function destroy() {
      console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
    }
    createDebug.enable(createDebug.load());
    return createDebug;
  }
  module2.exports = setup;
});
var require_browser = __commonJS((exports2, module2) => {
  exports2.formatArgs = formatArgs;
  exports2.save = save;
  exports2.load = load;
  exports2.useColors = useColors;
  exports2.storage = localstorage();
  exports2.destroy = /* @__PURE__ */ (() => {
    let warned = false;
    return () => {
      if (!warned) {
        warned = true;
        console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
      }
    };
  })();
  exports2.colors = [
    "#0000CC",
    "#0000FF",
    "#0033CC",
    "#0033FF",
    "#0066CC",
    "#0066FF",
    "#0099CC",
    "#0099FF",
    "#00CC00",
    "#00CC33",
    "#00CC66",
    "#00CC99",
    "#00CCCC",
    "#00CCFF",
    "#3300CC",
    "#3300FF",
    "#3333CC",
    "#3333FF",
    "#3366CC",
    "#3366FF",
    "#3399CC",
    "#3399FF",
    "#33CC00",
    "#33CC33",
    "#33CC66",
    "#33CC99",
    "#33CCCC",
    "#33CCFF",
    "#6600CC",
    "#6600FF",
    "#6633CC",
    "#6633FF",
    "#66CC00",
    "#66CC33",
    "#9900CC",
    "#9900FF",
    "#9933CC",
    "#9933FF",
    "#99CC00",
    "#99CC33",
    "#CC0000",
    "#CC0033",
    "#CC0066",
    "#CC0099",
    "#CC00CC",
    "#CC00FF",
    "#CC3300",
    "#CC3333",
    "#CC3366",
    "#CC3399",
    "#CC33CC",
    "#CC33FF",
    "#CC6600",
    "#CC6633",
    "#CC9900",
    "#CC9933",
    "#CCCC00",
    "#CCCC33",
    "#FF0000",
    "#FF0033",
    "#FF0066",
    "#FF0099",
    "#FF00CC",
    "#FF00FF",
    "#FF3300",
    "#FF3333",
    "#FF3366",
    "#FF3399",
    "#FF33CC",
    "#FF33FF",
    "#FF6600",
    "#FF6633",
    "#FF9900",
    "#FF9933",
    "#FFCC00",
    "#FFCC33"
  ];
  function useColors() {
    if (typeof window !== "undefined" && window.process && (window.process.type === "renderer" || window.process.__nwjs)) {
      return true;
    }
    if (typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) {
      return false;
    }
    let m;
    return typeof document !== "undefined" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || typeof window !== "undefined" && window.console && (window.console.firebug || window.console.exception && window.console.table) || typeof navigator !== "undefined" && navigator.userAgent && (m = navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/)) && parseInt(m[1], 10) >= 31 || typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/);
  }
  function formatArgs(args) {
    args[0] = (this.useColors ? "%c" : "") + this.namespace + (this.useColors ? " %c" : " ") + args[0] + (this.useColors ? "%c " : " ") + "+" + module2.exports.humanize(this.diff);
    if (!this.useColors) {
      return;
    }
    const c = "color: " + this.color;
    args.splice(1, 0, c, "color: inherit");
    let index = 0;
    let lastC = 0;
    args[0].replace(/%[a-zA-Z%]/g, (match) => {
      if (match === "%%") {
        return;
      }
      index++;
      if (match === "%c") {
        lastC = index;
      }
    });
    args.splice(lastC, 0, c);
  }
  exports2.log = console.debug || console.log || (() => {
  });
  function save(namespaces) {
    try {
      if (namespaces) {
        exports2.storage.setItem("debug", namespaces);
      } else {
        exports2.storage.removeItem("debug");
      }
    } catch (error) {
    }
  }
  function load() {
    let r;
    try {
      r = exports2.storage.getItem("debug") || exports2.storage.getItem("DEBUG");
    } catch (error) {
    }
    if (!r && typeof process !== "undefined" && "env" in process) {
      r = process.env.DEBUG;
    }
    return r;
  }
  function localstorage() {
    try {
      return localStorage;
    } catch (error) {
    }
  }
  module2.exports = require_common()(exports2);
  var { formatters } = module2.exports;
  formatters.j = function(v) {
    try {
      return JSON.stringify(v);
    } catch (error) {
      return "[UnexpectedJSONParseError]: " + error.message;
    }
  };
});
var require_has_flag = __commonJS((exports2, module2) => {
  module2.exports = (flag, argv = process.argv) => {
    const prefix = flag.startsWith("-") ? "" : flag.length === 1 ? "-" : "--";
    const position = argv.indexOf(prefix + flag);
    const terminatorPosition = argv.indexOf("--");
    return position !== -1 && (terminatorPosition === -1 || position < terminatorPosition);
  };
});
var require_supports_color = __commonJS((exports2, module2) => {
  var os = __require("os");
  var tty = __require("tty");
  var hasFlag = require_has_flag();
  var { env: env2 } = process;
  var forceColor;
  if (hasFlag("no-color") || hasFlag("no-colors") || hasFlag("color=false") || hasFlag("color=never")) {
    forceColor = 0;
  } else if (hasFlag("color") || hasFlag("colors") || hasFlag("color=true") || hasFlag("color=always")) {
    forceColor = 1;
  }
  if ("FORCE_COLOR" in env2) {
    if (env2.FORCE_COLOR === "true") {
      forceColor = 1;
    } else if (env2.FORCE_COLOR === "false") {
      forceColor = 0;
    } else {
      forceColor = env2.FORCE_COLOR.length === 0 ? 1 : Math.min(parseInt(env2.FORCE_COLOR, 10), 3);
    }
  }
  function translateLevel(level) {
    if (level === 0) {
      return false;
    }
    return {
      level,
      hasBasic: true,
      has256: level >= 2,
      has16m: level >= 3
    };
  }
  function supportsColor(haveStream, streamIsTTY) {
    if (forceColor === 0) {
      return 0;
    }
    if (hasFlag("color=16m") || hasFlag("color=full") || hasFlag("color=truecolor")) {
      return 3;
    }
    if (hasFlag("color=256")) {
      return 2;
    }
    if (haveStream && !streamIsTTY && forceColor === void 0) {
      return 0;
    }
    const min = forceColor || 0;
    if (env2.TERM === "dumb") {
      return min;
    }
    if (process.platform === "win32") {
      const osRelease = os.release().split(".");
      if (Number(osRelease[0]) >= 10 && Number(osRelease[2]) >= 10586) {
        return Number(osRelease[2]) >= 14931 ? 3 : 2;
      }
      return 1;
    }
    if ("CI" in env2) {
      if (["TRAVIS", "CIRCLECI", "APPVEYOR", "GITLAB_CI", "GITHUB_ACTIONS", "BUILDKITE"].some((sign) => sign in env2) || env2.CI_NAME === "codeship") {
        return 1;
      }
      return min;
    }
    if ("TEAMCITY_VERSION" in env2) {
      return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(env2.TEAMCITY_VERSION) ? 1 : 0;
    }
    if (env2.COLORTERM === "truecolor") {
      return 3;
    }
    if ("TERM_PROGRAM" in env2) {
      const version = parseInt((env2.TERM_PROGRAM_VERSION || "").split(".")[0], 10);
      switch (env2.TERM_PROGRAM) {
        case "iTerm.app":
          return version >= 3 ? 3 : 2;
        case "Apple_Terminal":
          return 2;
      }
    }
    if (/-256(color)?$/i.test(env2.TERM)) {
      return 2;
    }
    if (/^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(env2.TERM)) {
      return 1;
    }
    if ("COLORTERM" in env2) {
      return 1;
    }
    return min;
  }
  function getSupportLevel(stream) {
    const level = supportsColor(stream, stream && stream.isTTY);
    return translateLevel(level);
  }
  module2.exports = {
    supportsColor: getSupportLevel,
    stdout: translateLevel(supportsColor(true, tty.isatty(1))),
    stderr: translateLevel(supportsColor(true, tty.isatty(2)))
  };
});
var require_node = __commonJS((exports2, module2) => {
  var tty = __require("tty");
  var util = __require("util");
  exports2.init = init;
  exports2.log = log;
  exports2.formatArgs = formatArgs;
  exports2.save = save;
  exports2.load = load;
  exports2.useColors = useColors;
  exports2.destroy = util.deprecate(() => {
  }, "Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
  exports2.colors = [6, 2, 3, 4, 5, 1];
  try {
    const supportsColor = require_supports_color();
    if (supportsColor && (supportsColor.stderr || supportsColor).level >= 2) {
      exports2.colors = [
        20,
        21,
        26,
        27,
        32,
        33,
        38,
        39,
        40,
        41,
        42,
        43,
        44,
        45,
        56,
        57,
        62,
        63,
        68,
        69,
        74,
        75,
        76,
        77,
        78,
        79,
        80,
        81,
        92,
        93,
        98,
        99,
        112,
        113,
        128,
        129,
        134,
        135,
        148,
        149,
        160,
        161,
        162,
        163,
        164,
        165,
        166,
        167,
        168,
        169,
        170,
        171,
        172,
        173,
        178,
        179,
        184,
        185,
        196,
        197,
        198,
        199,
        200,
        201,
        202,
        203,
        204,
        205,
        206,
        207,
        208,
        209,
        214,
        215,
        220,
        221
      ];
    }
  } catch (error) {
  }
  exports2.inspectOpts = Object.keys(process.env).filter((key) => {
    return /^debug_/i.test(key);
  }).reduce((obj, key) => {
    const prop = key.substring(6).toLowerCase().replace(/_([a-z])/g, (_, k) => {
      return k.toUpperCase();
    });
    let val = process.env[key];
    if (/^(yes|on|true|enabled)$/i.test(val)) {
      val = true;
    } else if (/^(no|off|false|disabled)$/i.test(val)) {
      val = false;
    } else if (val === "null") {
      val = null;
    } else {
      val = Number(val);
    }
    obj[prop] = val;
    return obj;
  }, {});
  function useColors() {
    return "colors" in exports2.inspectOpts ? Boolean(exports2.inspectOpts.colors) : tty.isatty(process.stderr.fd);
  }
  function formatArgs(args) {
    const { namespace: name, useColors: useColors2 } = this;
    if (useColors2) {
      const c = this.color;
      const colorCode = "\x1B[3" + (c < 8 ? c : "8;5;" + c);
      const prefix = `  ${colorCode};1m${name} \x1B[0m`;
      args[0] = prefix + args[0].split(`
`).join(`
` + prefix);
      args.push(colorCode + "m+" + module2.exports.humanize(this.diff) + "\x1B[0m");
    } else {
      args[0] = getDate() + name + " " + args[0];
    }
  }
  function getDate() {
    if (exports2.inspectOpts.hideDate) {
      return "";
    }
    return (/* @__PURE__ */ new Date()).toISOString() + " ";
  }
  function log(...args) {
    return process.stderr.write(util.formatWithOptions(exports2.inspectOpts, ...args) + `
`);
  }
  function save(namespaces) {
    if (namespaces) {
      process.env.DEBUG = namespaces;
    } else {
      delete process.env.DEBUG;
    }
  }
  function load() {
    return process.env.DEBUG;
  }
  function init(debug) {
    debug.inspectOpts = {};
    const keys = Object.keys(exports2.inspectOpts);
    for (let i = 0; i < keys.length; i++) {
      debug.inspectOpts[keys[i]] = exports2.inspectOpts[keys[i]];
    }
  }
  module2.exports = require_common()(exports2);
  var { formatters } = module2.exports;
  formatters.o = function(v) {
    this.inspectOpts.colors = this.useColors;
    return util.inspect(v, this.inspectOpts).split(`
`).map((str) => str.trim()).join(" ");
  };
  formatters.O = function(v) {
    this.inspectOpts.colors = this.useColors;
    return util.inspect(v, this.inspectOpts);
  };
});
var require_src = __commonJS((exports2, module2) => {
  if (typeof process === "undefined" || process.type === "renderer" || false || process.__nwjs) {
    module2.exports = require_browser();
  } else {
    module2.exports = require_node();
  }
});
var require_src2 = __commonJS((exports2) => {
  var __importDefault = exports2 && exports2.__importDefault || function(mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
  Object.defineProperty(exports2, "__esModule", { value: true });
  var fs_1 = __require("fs");
  var debug_1 = __importDefault(require_src());
  var log = debug_1.default("@kwsites/file-exists");
  function check(path42, isFile, isDirectory) {
    log(`checking %s`, path42);
    try {
      const stat2 = fs_1.statSync(path42);
      if (stat2.isFile() && isFile) {
        log(`[OK] path represents a file`);
        return true;
      }
      if (stat2.isDirectory() && isDirectory) {
        log(`[OK] path represents a directory`);
        return true;
      }
      log(`[FAIL] path represents something other than a file or directory`);
      return false;
    } catch (e) {
      if (e.code === "ENOENT") {
        log(`[FAIL] path is not accessible: %o`, e);
        return false;
      }
      log(`[FATAL] %o`, e);
      throw e;
    }
  }
  function exists(path42, type = exports2.READABLE) {
    return check(path42, (type & exports2.FILE) > 0, (type & exports2.FOLDER) > 0);
  }
  exports2.exists = exists;
  exports2.FILE = 1;
  exports2.FOLDER = 2;
  exports2.READABLE = exports2.FILE + exports2.FOLDER;
});
var require_dist = __commonJS((exports2) => {
  function __export3(m) {
    for (var p in m)
      if (!exports2.hasOwnProperty(p))
        exports2[p] = m[p];
  }
  Object.defineProperty(exports2, "__esModule", { value: true });
  __export3(require_src2());
});
var require_dist2 = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.createDeferred = exports2.deferred = void 0;
  function deferred() {
    let done;
    let fail;
    let status = "pending";
    const promise = new Promise((_done, _fail) => {
      done = _done;
      fail = _fail;
    });
    return {
      promise,
      done(result) {
        if (status === "pending") {
          status = "resolved";
          done(result);
        }
      },
      fail(error) {
        if (status === "pending") {
          status = "rejected";
          fail(error);
        }
      },
      get fulfilled() {
        return status !== "pending";
      },
      get status() {
        return status;
      }
    };
  }
  exports2.deferred = deferred;
  exports2.createDeferred = deferred;
  exports2.default = deferred;
});
var BUILT_IN_AGENT_NAMES = [
  "hive-master",
  "architect-planner",
  "swarm-orchestrator",
  "scout-researcher",
  "forager-worker",
  "hygienic-reviewer"
];
var CUSTOM_AGENT_RESERVED_NAMES = [
  ...BUILT_IN_AGENT_NAMES,
  "hive",
  "architect",
  "swarm",
  "scout",
  "forager",
  "hygienic",
  "receiver",
  "build",
  "plan",
  "code"
];
var DEFAULT_AGENT_MODELS = {
  "hive-master": "github-copilot/claude-opus-4.5",
  "architect-planner": "github-copilot/gpt-5.2-codex",
  "swarm-orchestrator": "github-copilot/claude-opus-4.5",
  "scout-researcher": "zai-coding-plan/glm-4.7",
  "forager-worker": "github-copilot/gpt-5.2-codex",
  "hygienic-reviewer": "github-copilot/gpt-5.2-codex"
};
var DEFAULT_HIVE_CONFIG = {
  $schema: "https://raw.githubusercontent.com/tctinh/agent-hive/main/packages/opencode-hive/schema/agent_hive.schema.json",
  enableToolsFor: [],
  disableSkills: [],
  disableMcps: [],
  agentMode: "unified",
  sandbox: "none",
  customAgents: {
    "forager-example-template": {
      baseAgent: "forager-worker",
      description: "Example template only: rename or delete this entry before use. Do not expect planners/orchestrators to select this placeholder agent as configured.",
      model: "anthropic/claude-sonnet-4-20250514",
      temperature: 0.2,
      variant: "high",
      autoLoadSkills: ["test-driven-development"]
    },
    "hygienic-example-template": {
      baseAgent: "hygienic-reviewer",
      description: "Example template only: rename or delete this entry before use. Do not expect planners/orchestrators to select this placeholder agent as configured.",
      autoLoadSkills: ["code-reviewer"]
    }
  },
  agents: {
    "hive-master": {
      model: DEFAULT_AGENT_MODELS["hive-master"],
      temperature: 0.5,
      skills: [
        "brainstorming",
        "writing-plans",
        "dispatching-parallel-agents",
        "executing-plans"
      ],
      autoLoadSkills: ["parallel-exploration"]
    },
    "architect-planner": {
      model: DEFAULT_AGENT_MODELS["architect-planner"],
      temperature: 0.7,
      skills: ["brainstorming", "writing-plans"],
      autoLoadSkills: ["parallel-exploration"]
    },
    "swarm-orchestrator": {
      model: DEFAULT_AGENT_MODELS["swarm-orchestrator"],
      temperature: 0.5,
      skills: ["dispatching-parallel-agents", "executing-plans"],
      autoLoadSkills: []
    },
    "scout-researcher": {
      model: DEFAULT_AGENT_MODELS["scout-researcher"],
      temperature: 0.5,
      skills: [],
      autoLoadSkills: []
    },
    "forager-worker": {
      model: DEFAULT_AGENT_MODELS["forager-worker"],
      temperature: 0.3,
      autoLoadSkills: ["test-driven-development", "verification-before-completion"]
    },
    "hygienic-reviewer": {
      model: DEFAULT_AGENT_MODELS["hygienic-reviewer"],
      temperature: 0.3,
      skills: ["systematic-debugging", "code-reviewer"],
      autoLoadSkills: []
    }
  }
};
var HIVE_DIR = ".hive";
var FEATURES_DIR = "features";
var TASKS_DIR = "tasks";
var CONTEXT_DIR = "context";
var REVIEW_COMMENTS_DIR = "comments";
var PLAN_FILE = "plan.md";
var COMMENTS_FILE = "comments.json";
var OVERVIEW_FILE = "overview.md";
var FEATURE_FILE = "feature.json";
var STATUS_FILE = "status.json";
var REPORT_FILE = "report.md";
var APPROVED_FILE = "APPROVED";
var ACTIVE_FEATURE_FILE = "active-feature";
function getHivePath(projectRoot) {
  return path.join(projectRoot, HIVE_DIR);
}
function getFeaturesPath(projectRoot) {
  return path.join(getHivePath(projectRoot), FEATURES_DIR);
}
function getActiveFeaturePath(projectRoot) {
  return path.join(getHivePath(projectRoot), ACTIVE_FEATURE_FILE);
}
function parseIndexedFeatureDirectoryName(directoryName) {
  const match = directoryName.match(/^(\d+)[_-](.+)$/);
  if (!match) {
    return null;
  }
  return {
    index: Number.parseInt(match[1], 10),
    logicalName: match[2]
  };
}
function listFeatureDirectories(projectRoot) {
  const featuresPath = getFeaturesPath(projectRoot);
  if (!fs.existsSync(featuresPath)) {
    return [];
  }
  return fs.readdirSync(featuresPath, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => {
    const directoryName = entry.name;
    const parsed = parseIndexedFeatureDirectoryName(directoryName);
    const featureJsonPath = path.join(featuresPath, directoryName, FEATURE_FILE);
    const featureJson = readJson(featureJsonPath);
    return {
      directoryName,
      logicalName: featureJson?.name || parsed?.logicalName || directoryName,
      index: parsed?.index ?? null
    };
  }).sort((left, right) => {
    if (left.index !== null && right.index !== null) {
      return left.index - right.index;
    }
    if (left.index !== null) {
      return 1;
    }
    if (right.index !== null) {
      return -1;
    }
    return left.logicalName.localeCompare(right.logicalName);
  });
}
function resolveFeatureDirectoryName(projectRoot, featureName) {
  const directPath = path.join(getFeaturesPath(projectRoot), featureName);
  if (fs.existsSync(directPath)) {
    return featureName;
  }
  const match = listFeatureDirectories(projectRoot).find((entry) => entry.logicalName === featureName);
  return match?.directoryName || featureName;
}
function getNextIndexedFeatureDirectoryName(projectRoot, featureName) {
  const indexedEntries = listFeatureDirectories(projectRoot).filter((entry) => entry.index !== null);
  const nextIndex = indexedEntries.reduce((max, entry) => Math.max(max, entry.index ?? 0), 0) + 1;
  return `${String(nextIndex).padStart(2, "0")}_${featureName}`;
}
function getFeaturePath(projectRoot, featureName) {
  return path.join(getFeaturesPath(projectRoot), resolveFeatureDirectoryName(projectRoot, featureName));
}
function getPlanPath(projectRoot, featureName) {
  return path.join(getFeaturePath(projectRoot, featureName), PLAN_FILE);
}
function getCommentsPath(projectRoot, featureName) {
  return path.join(getFeaturePath(projectRoot, featureName), COMMENTS_FILE);
}
function getReviewCommentsPath(projectRoot, featureName, document2) {
  return path.join(getFeaturePath(projectRoot, featureName), REVIEW_COMMENTS_DIR, `${document2}.json`);
}
function getFeatureJsonPath(projectRoot, featureName) {
  return path.join(getFeaturePath(projectRoot, featureName), FEATURE_FILE);
}
function getContextPath(projectRoot, featureName) {
  return path.join(getFeaturePath(projectRoot, featureName), CONTEXT_DIR);
}
function getOverviewPath(projectRoot, featureName) {
  return path.join(getContextPath(projectRoot, featureName), OVERVIEW_FILE);
}
function getTasksPath(projectRoot, featureName) {
  return path.join(getFeaturePath(projectRoot, featureName), TASKS_DIR);
}
function getTaskPath(projectRoot, featureName, taskFolder) {
  return path.join(getTasksPath(projectRoot, featureName), taskFolder);
}
function getTaskStatusPath(projectRoot, featureName, taskFolder) {
  return path.join(getTaskPath(projectRoot, featureName, taskFolder), STATUS_FILE);
}
function getTaskReportPath(projectRoot, featureName, taskFolder) {
  return path.join(getTaskPath(projectRoot, featureName, taskFolder), REPORT_FILE);
}
function getTaskSpecPath(projectRoot, featureName, taskFolder) {
  return path.join(getTaskPath(projectRoot, featureName, taskFolder), "spec.md");
}
function getApprovedPath(projectRoot, featureName) {
  return path.join(getFeaturePath(projectRoot, featureName), APPROVED_FILE);
}
var SUBTASKS_DIR = "subtasks";
var SPEC_FILE = "spec.md";
function getSubtasksPath(projectRoot, featureName, taskFolder) {
  return path.join(getTaskPath(projectRoot, featureName, taskFolder), SUBTASKS_DIR);
}
function getSubtaskPath(projectRoot, featureName, taskFolder, subtaskFolder) {
  return path.join(getSubtasksPath(projectRoot, featureName, taskFolder), subtaskFolder);
}
function getSubtaskStatusPath(projectRoot, featureName, taskFolder, subtaskFolder) {
  return path.join(getSubtaskPath(projectRoot, featureName, taskFolder, subtaskFolder), STATUS_FILE);
}
function getSubtaskSpecPath(projectRoot, featureName, taskFolder, subtaskFolder) {
  return path.join(getSubtaskPath(projectRoot, featureName, taskFolder, subtaskFolder), SPEC_FILE);
}
function getSubtaskReportPath(projectRoot, featureName, taskFolder, subtaskFolder) {
  return path.join(getSubtaskPath(projectRoot, featureName, taskFolder, subtaskFolder), REPORT_FILE);
}
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}
function fileExists(filePath) {
  return fs.existsSync(filePath);
}
function readJson(filePath) {
  if (!fs.existsSync(filePath))
    return null;
  const content = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(content);
}
function writeJson(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}
var DEFAULT_LOCK_OPTIONS = {
  timeout: 5e3,
  retryInterval: 50,
  staleLockTTL: 3e4
};
function getLockPath(filePath) {
  return `${filePath}.lock`;
}
function isLockStale(lockPath, staleTTL) {
  try {
    const stat2 = fs.statSync(lockPath);
    const age = Date.now() - stat2.mtimeMs;
    return age > staleTTL;
  } catch {
    return true;
  }
}
function acquireLockSync(filePath, options = {}) {
  const opts = { ...DEFAULT_LOCK_OPTIONS, ...options };
  const lockPath = getLockPath(filePath);
  const lockDir = path.dirname(lockPath);
  const startTime = Date.now();
  const lockContent = JSON.stringify({
    pid: process.pid,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    filePath
  });
  ensureDir(lockDir);
  while (true) {
    try {
      const fd = fs.openSync(lockPath, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY);
      fs.writeSync(fd, lockContent);
      fs.closeSync(fd);
      return () => {
        try {
          fs.unlinkSync(lockPath);
        } catch {
        }
      };
    } catch (err) {
      const error = err;
      if (error.code === "ENOENT") {
        ensureDir(lockDir);
      } else if (error.code === "EEXIST") {
        if (isLockStale(lockPath, opts.staleLockTTL)) {
          try {
            fs.unlinkSync(lockPath);
            continue;
          } catch {
          }
        }
      } else {
        throw error;
      }
      if (Date.now() - startTime >= opts.timeout) {
        throw new Error(`Failed to acquire lock on ${filePath} after ${opts.timeout}ms. Lock file: ${lockPath}`);
      }
      const waitUntil = Date.now() + opts.retryInterval;
      while (Date.now() < waitUntil) {
      }
    }
  }
}
function writeAtomic(filePath, content) {
  ensureDir(path.dirname(filePath));
  const tempPath = `${filePath}.tmp.${process.pid}.${Date.now()}`;
  try {
    fs.writeFileSync(tempPath, content);
    fs.renameSync(tempPath, filePath);
  } catch (error) {
    try {
      fs.unlinkSync(tempPath);
    } catch {
    }
    throw error;
  }
}
function writeJsonAtomic(filePath, data) {
  writeAtomic(filePath, JSON.stringify(data, null, 2));
}
function deepMerge(target, patch) {
  const result = { ...target };
  for (const key of Object.keys(patch)) {
    const patchValue = patch[key];
    if (patchValue === void 0) {
      continue;
    }
    if (patchValue !== null && typeof patchValue === "object" && !Array.isArray(patchValue) && result[key] !== null && typeof result[key] === "object" && !Array.isArray(result[key])) {
      result[key] = deepMerge(result[key], patchValue);
    } else {
      result[key] = patchValue;
    }
  }
  return result;
}
function patchJsonLockedSync(filePath, patch, options = {}) {
  const release = acquireLockSync(filePath, options);
  try {
    const current = readJson(filePath) || {};
    const merged = deepMerge(current, patch);
    writeJsonAtomic(filePath, merged);
    return merged;
  } finally {
    release();
  }
}
function readText(filePath) {
  if (!fs.existsSync(filePath))
    return null;
  return fs.readFileSync(filePath, "utf-8");
}
function writeText(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content);
}
var ReviewService = class {
  projectRoot;
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
  }
  getThreads(featureName, document2) {
    const data = this.readComments(featureName, document2);
    return data?.threads ?? [];
  }
  saveThreads(featureName, document2, threads) {
    writeJson(this.getCanonicalPath(featureName, document2), { threads });
  }
  clear(featureName, document2) {
    this.saveThreads(featureName, document2, []);
    if (document2 === "plan" && fileExists(getCommentsPath(this.projectRoot, featureName))) {
      writeJson(getCommentsPath(this.projectRoot, featureName), { threads: [] });
    }
  }
  countByDocument(featureName) {
    return {
      plan: this.getThreads(featureName, "plan").length,
      overview: this.getThreads(featureName, "overview").length
    };
  }
  hasUnresolvedThreads(featureName, document2) {
    if (document2) {
      return this.getThreads(featureName, document2).length > 0;
    }
    const counts = this.countByDocument(featureName);
    return counts.plan > 0 || counts.overview > 0;
  }
  readComments(featureName, document2) {
    const canonicalPath = this.getCanonicalPath(featureName, document2);
    const canonical = readJson(canonicalPath);
    if (canonical) {
      return canonical;
    }
    if (document2 === "plan") {
      return readJson(getCommentsPath(this.projectRoot, featureName));
    }
    return null;
  }
  getCanonicalPath(featureName, document2) {
    return getReviewCommentsPath(this.projectRoot, featureName, document2);
  }
};
var FeatureService = class {
  projectRoot;
  reviewService;
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
  }
  getReviewService() {
    if (!this.reviewService) {
      this.reviewService = new ReviewService(this.projectRoot);
    }
    return this.reviewService;
  }
  create(name, ticket) {
    const existingFeature = listFeatureDirectories(this.projectRoot).find((feature2) => feature2.logicalName === name);
    if (existingFeature) {
      throw new Error(`Feature '${name}' already exists`);
    }
    const featurePath = path3.join(getFeaturesPath(this.projectRoot), getNextIndexedFeatureDirectoryName(this.projectRoot, name));
    ensureDir(featurePath);
    ensureDir(getContextPath(this.projectRoot, name));
    ensureDir(getTasksPath(this.projectRoot, name));
    const feature = {
      name,
      status: "planning",
      ticket,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    writeJson(getFeatureJsonPath(this.projectRoot, name), feature);
    ensureDir(path3.dirname(getActiveFeaturePath(this.projectRoot)));
    fs3.writeFileSync(getActiveFeaturePath(this.projectRoot), name, "utf-8");
    return feature;
  }
  get(name) {
    return readJson(getFeatureJsonPath(this.projectRoot, name));
  }
  list() {
    return listFeatureDirectories(this.projectRoot).map((feature) => feature.logicalName).sort((left, right) => left.localeCompare(right));
  }
  getActive() {
    const activeName = this.readActiveFeatureName();
    if (activeName) {
      const activeFeature = this.get(activeName);
      if (activeFeature && activeFeature.status !== "completed") {
        return activeFeature;
      }
    }
    const features = this.list();
    for (const name of features) {
      const feature = this.get(name);
      if (feature && feature.status !== "completed") {
        return feature;
      }
    }
    return null;
  }
  setActive(name) {
    const feature = this.get(name);
    if (!feature) {
      throw new Error(`Feature '${name}' not found`);
    }
    ensureDir(path3.dirname(getActiveFeaturePath(this.projectRoot)));
    fs3.writeFileSync(getActiveFeaturePath(this.projectRoot), name, "utf-8");
  }
  updateStatus(name, status) {
    const feature = this.get(name);
    if (!feature)
      throw new Error(`Feature '${name}' not found`);
    feature.status = status;
    if (status === "approved" && !feature.approvedAt) {
      feature.approvedAt = (/* @__PURE__ */ new Date()).toISOString();
    }
    if (status === "completed" && !feature.completedAt) {
      feature.completedAt = (/* @__PURE__ */ new Date()).toISOString();
    }
    writeJson(getFeatureJsonPath(this.projectRoot, name), feature);
    return feature;
  }
  getInfo(name) {
    const feature = this.get(name);
    if (!feature)
      return null;
    const tasks = this.getTasks(name);
    const hasPlan = fileExists(getPlanPath(this.projectRoot, name));
    const hasOverview = fileExists(getOverviewPath(this.projectRoot, name));
    const reviewCounts = this.getReviewService().countByDocument(name);
    const commentCount = reviewCounts.plan + reviewCounts.overview;
    return {
      name: feature.name,
      status: feature.status,
      tasks,
      hasPlan,
      hasOverview,
      commentCount,
      reviewCounts
    };
  }
  getTasks(featureName) {
    const tasksPath = getTasksPath(this.projectRoot, featureName);
    if (!fileExists(tasksPath))
      return [];
    const folders = fs3.readdirSync(tasksPath, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
    return folders.map((folder) => {
      const statusPath = `${tasksPath}/${folder}/status.json`;
      const status = readJson(statusPath);
      const name = folder.replace(/^\d+-/, "");
      return {
        folder,
        name,
        status: status?.status || "pending",
        origin: status?.origin || "plan",
        planTitle: status?.planTitle,
        summary: status?.summary
      };
    });
  }
  complete(name) {
    const feature = this.get(name);
    if (!feature)
      throw new Error(`Feature '${name}' not found`);
    if (feature.status === "completed") {
      throw new Error(`Feature '${name}' is already completed`);
    }
    return this.updateStatus(name, "completed");
  }
  setSession(name, sessionId) {
    const feature = this.get(name);
    if (!feature)
      throw new Error(`Feature '${name}' not found`);
    feature.sessionId = sessionId;
    writeJson(getFeatureJsonPath(this.projectRoot, name), feature);
  }
  getSession(name) {
    const feature = this.get(name);
    return feature?.sessionId;
  }
  readActiveFeatureName() {
    const activeFeaturePath = getActiveFeaturePath(this.projectRoot);
    if (!fileExists(activeFeaturePath)) {
      return null;
    }
    const activeFeature = fs3.readFileSync(activeFeaturePath, "utf-8").trim();
    return activeFeature || null;
  }
};
var PlanService = class {
  projectRoot;
  reviewService;
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
  }
  getReviewService() {
    if (!this.reviewService) {
      this.reviewService = new ReviewService(this.projectRoot);
    }
    return this.reviewService;
  }
  write(featureName, content) {
    const planPath = getPlanPath(this.projectRoot, featureName);
    writeText(planPath, content);
    this.clearComments(featureName);
    this.revokeApproval(featureName);
    return planPath;
  }
  read(featureName) {
    const planPath = getPlanPath(this.projectRoot, featureName);
    const content = readText(planPath);
    if (content === null)
      return null;
    const comments2 = this.getComments(featureName);
    const isApproved = this.isApproved(featureName);
    return {
      content,
      status: isApproved ? "approved" : "planning",
      comments: comments2
    };
  }
  approve(featureName) {
    if (!fileExists(getPlanPath(this.projectRoot, featureName))) {
      throw new Error(`No plan.md found for feature '${featureName}'`);
    }
    if (this.getReviewService().hasUnresolvedThreads(featureName)) {
      throw new Error(`Cannot approve feature '${featureName}' with unresolved review comments`);
    }
    const approvedPath = getApprovedPath(this.projectRoot, featureName);
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    fs4.writeFileSync(approvedPath, `Approved at ${timestamp}
`);
    const featurePath = getFeatureJsonPath(this.projectRoot, featureName);
    const feature = readJson(featurePath);
    if (feature) {
      feature.status = "approved";
      feature.approvedAt = timestamp;
      writeJson(featurePath, feature);
    }
  }
  isApproved(featureName) {
    return fileExists(getApprovedPath(this.projectRoot, featureName));
  }
  revokeApproval(featureName) {
    const approvedPath = getApprovedPath(this.projectRoot, featureName);
    if (fileExists(approvedPath)) {
      fs4.unlinkSync(approvedPath);
    }
    const featurePath = getFeatureJsonPath(this.projectRoot, featureName);
    const feature = readJson(featurePath);
    if (feature && feature.status === "approved") {
      feature.status = "planning";
      delete feature.approvedAt;
      writeJson(featurePath, feature);
    }
  }
  getComments(featureName) {
    return this.getReviewService().getThreads(featureName, "plan");
  }
  addComment(featureName, comment) {
    const newComment = {
      ...comment,
      id: `comment-${Date.now()}`
    };
    this.getReviewService().saveThreads(featureName, "plan", [
      ...this.getComments(featureName),
      newComment
    ]);
    return newComment;
  }
  clearComments(featureName) {
    this.getReviewService().clear(featureName, "plan");
  }
};
var TASK_STATUS_SCHEMA_VERSION = 1;
var EXECUTION_HISTORY_STATUSES = /* @__PURE__ */ new Set([
  "in_progress",
  "done",
  "blocked",
  "failed",
  "partial"
]);
var TaskService = class {
  projectRoot;
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
  }
  sync(featureName, options) {
    const planPath = getPlanPath(this.projectRoot, featureName);
    const planContent = readText(planPath);
    if (!planContent) {
      throw new Error(`No plan.md found for feature '${featureName}'`);
    }
    const planTasks = this.parseTasksFromPlan(planContent);
    this.validateDependencyGraph(planTasks, featureName);
    const existingTasks = this.list(featureName);
    const result = {
      created: [],
      removed: [],
      kept: [],
      manual: []
    };
    const existingByName = new Map(existingTasks.map((t) => [t.folder, t]));
    const refreshPending = options?.refreshPending === true;
    for (const existing of existingTasks) {
      if (existing.origin === "manual") {
        result.manual.push(existing.folder);
        continue;
      }
      if (EXECUTION_HISTORY_STATUSES.has(existing.status)) {
        result.kept.push(existing.folder);
        continue;
      }
      if (existing.status === "cancelled") {
        this.deleteTask(featureName, existing.folder);
        result.removed.push(existing.folder);
        continue;
      }
      const stillInPlan = planTasks.some((p) => p.folder === existing.folder);
      if (!stillInPlan) {
        this.deleteTask(featureName, existing.folder);
        result.removed.push(existing.folder);
      } else if (refreshPending && existing.status === "pending") {
        const planTask = planTasks.find((p) => p.folder === existing.folder);
        if (planTask) {
          this.refreshPendingTask(featureName, planTask, planTasks, planContent);
        }
        result.kept.push(existing.folder);
      } else {
        result.kept.push(existing.folder);
      }
    }
    for (const planTask of planTasks) {
      if (!existingByName.has(planTask.folder)) {
        this.createFromPlan(featureName, planTask, planTasks, planContent);
        result.created.push(planTask.folder);
      }
    }
    return result;
  }
  create(featureName, name, order, metadata) {
    const tasksPath = getTasksPath(this.projectRoot, featureName);
    const existingFolders = this.listFolders(featureName);
    if (metadata?.source === "review" && metadata.dependsOn && metadata.dependsOn.length > 0) {
      throw new Error(`Review-sourced manual tasks cannot have explicit dependsOn. Cross-task dependencies require a plan amendment. Either remove the dependsOn field or amend the plan to express the dependency.`);
    }
    const nextOrder = order ?? this.getNextOrder(existingFolders);
    const folder = `${String(nextOrder).padStart(2, "0")}-${name}`;
    const collision = existingFolders.find((f) => {
      const match = f.match(/^(\d+)-/);
      return match && parseInt(match[1], 10) === nextOrder;
    });
    if (collision) {
      throw new Error(`Task folder collision: order ${nextOrder} already exists as "${collision}". Choose a different order number or omit to auto-increment.`);
    }
    const taskPath = getTaskPath(this.projectRoot, featureName, folder);
    ensureDir(taskPath);
    const dependsOn = metadata?.dependsOn ?? [];
    const status = {
      status: "pending",
      origin: "manual",
      planTitle: name,
      dependsOn,
      ...metadata ? { metadata: { ...metadata, dependsOn: void 0 } } : {}
    };
    writeJson(getTaskStatusPath(this.projectRoot, featureName, folder), status);
    const specContent = this.buildManualTaskSpec(featureName, folder, name, dependsOn, metadata);
    writeText(getTaskSpecPath(this.projectRoot, featureName, folder), specContent);
    return folder;
  }
  createFromPlan(featureName, task, allTasks, planContent) {
    const taskPath = getTaskPath(this.projectRoot, featureName, task.folder);
    ensureDir(taskPath);
    const dependsOn = this.resolveDependencies(task, allTasks);
    const status = {
      status: "pending",
      origin: "plan",
      planTitle: task.name,
      dependsOn
    };
    writeJson(getTaskStatusPath(this.projectRoot, featureName, task.folder), status);
    const specContent = this.buildSpecContent({
      featureName,
      task,
      dependsOn,
      allTasks,
      planContent
    });
    writeText(getTaskSpecPath(this.projectRoot, featureName, task.folder), specContent);
  }
  refreshPendingTask(featureName, task, allTasks, planContent) {
    const dependsOn = this.resolveDependencies(task, allTasks);
    const statusPath = getTaskStatusPath(this.projectRoot, featureName, task.folder);
    const current = readJson(statusPath);
    if (current) {
      const updated = {
        ...current,
        planTitle: task.name,
        dependsOn
      };
      writeJson(statusPath, updated);
    }
    const specContent = this.buildSpecContent({
      featureName,
      task,
      dependsOn,
      allTasks,
      planContent
    });
    writeText(getTaskSpecPath(this.projectRoot, featureName, task.folder), specContent);
  }
  buildSpecContent(params) {
    const { featureName, task, dependsOn, allTasks, planContent, contextFiles = [], completedTasks = [] } = params;
    const getTaskType = (planSection2, taskName) => {
      if (!planSection2) {
        return null;
      }
      const fileTypeMatches = Array.from(planSection2.matchAll(/-\s*(Create|Modify|Test):/gi)).map((match) => match[1].toLowerCase());
      const fileTypes = new Set(fileTypeMatches);
      if (fileTypes.size === 0) {
        return taskName.toLowerCase().includes("test") ? "testing" : null;
      }
      if (fileTypes.size === 1) {
        const onlyType = Array.from(fileTypes)[0];
        if (onlyType === "create")
          return "greenfield";
        if (onlyType === "test")
          return "testing";
      }
      if (fileTypes.has("modify")) {
        return "modification";
      }
      return null;
    };
    const specLines = [
      `# Task: ${task.folder}`,
      "",
      `## Feature: ${featureName}`,
      "",
      "## Dependencies",
      ""
    ];
    if (dependsOn.length > 0) {
      for (const dep of dependsOn) {
        const depTask = allTasks.find((t) => t.folder === dep);
        if (depTask) {
          specLines.push(`- **${depTask.order}. ${depTask.name}** (${dep})`);
        } else {
          specLines.push(`- ${dep}`);
        }
      }
    } else {
      specLines.push("_None_");
    }
    specLines.push("", "## Plan Section", "");
    const planSection = this.extractPlanSection(planContent ?? null, task);
    if (planSection) {
      specLines.push(planSection.trim());
    } else {
      specLines.push("_No plan section available._");
    }
    specLines.push("");
    const taskType = getTaskType(planSection, task.name);
    if (taskType) {
      specLines.push("## Task Type", "", taskType, "");
    }
    if (contextFiles.length > 0) {
      const contextCompiled = contextFiles.map((f) => `## ${f.name}

${f.content}`).join(`

---

`);
      specLines.push("## Context", "", contextCompiled, "");
    }
    if (completedTasks.length > 0) {
      const completedLines = completedTasks.map((t) => `- ${t.name}: ${t.summary}`);
      specLines.push("## Completed Tasks", "", ...completedLines, "");
    }
    return specLines.join(`
`);
  }
  extractPlanSection(planContent, task) {
    if (!planContent)
      return null;
    const escapedTitle = task.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const titleRegex = new RegExp(`###\\s*\\d+\\.\\s*${escapedTitle}[\\s\\S]*?(?=###|$)`, "i");
    let taskMatch = planContent.match(titleRegex);
    if (!taskMatch && task.order > 0) {
      const orderRegex = new RegExp(`###\\s*${task.order}\\.\\s*[^\\n]+[\\s\\S]*?(?=###|$)`, "i");
      taskMatch = planContent.match(orderRegex);
    }
    return taskMatch ? taskMatch[0].trim() : null;
  }
  resolveDependencies(task, allTasks) {
    if (task.dependsOnNumbers !== null && task.dependsOnNumbers.length === 0) {
      return [];
    }
    if (task.dependsOnNumbers !== null) {
      return task.dependsOnNumbers.map((num) => allTasks.find((t) => t.order === num)?.folder).filter((folder) => folder !== void 0);
    }
    if (task.order === 1) {
      return [];
    }
    const previousTask = allTasks.find((t) => t.order === task.order - 1);
    return previousTask ? [previousTask.folder] : [];
  }
  validateDependencyGraph(tasks, featureName) {
    const taskNumbers = new Set(tasks.map((t) => t.order));
    for (const task of tasks) {
      if (task.dependsOnNumbers === null) {
        continue;
      }
      for (const depNum of task.dependsOnNumbers) {
        if (depNum === task.order) {
          throw new Error(`Invalid dependency graph in plan.md: Self-dependency detected for task ${task.order} ("${task.name}"). A task cannot depend on itself. Please fix the "Depends on:" line in plan.md.`);
        }
        if (!taskNumbers.has(depNum)) {
          throw new Error(`Invalid dependency graph in plan.md: Unknown task number ${depNum} referenced in dependencies for task ${task.order} ("${task.name}"). Available task numbers are: ${Array.from(taskNumbers).sort((a, b) => a - b).join(", ")}. Please fix the "Depends on:" line in plan.md.`);
        }
      }
    }
    this.detectCycles(tasks);
  }
  detectCycles(tasks) {
    const taskByOrder = new Map(tasks.map((t) => [t.order, t]));
    const getDependencies = (task) => {
      if (task.dependsOnNumbers !== null) {
        return task.dependsOnNumbers;
      }
      if (task.order === 1) {
        return [];
      }
      return [task.order - 1];
    };
    const visited = /* @__PURE__ */ new Map();
    const path42 = [];
    const dfs = (taskOrder) => {
      const state = visited.get(taskOrder);
      if (state === 2) {
        return;
      }
      if (state === 1) {
        const cycleStart = path42.indexOf(taskOrder);
        const cyclePath = [...path42.slice(cycleStart), taskOrder];
        const cycleDesc = cyclePath.join(" -> ");
        throw new Error(`Invalid dependency graph in plan.md: Cycle detected in task dependencies: ${cycleDesc}. Tasks cannot have circular dependencies. Please fix the "Depends on:" lines in plan.md.`);
      }
      visited.set(taskOrder, 1);
      path42.push(taskOrder);
      const task = taskByOrder.get(taskOrder);
      if (task) {
        const deps = getDependencies(task);
        for (const depOrder of deps) {
          dfs(depOrder);
        }
      }
      path42.pop();
      visited.set(taskOrder, 2);
    };
    for (const task of tasks) {
      if (!visited.has(task.order)) {
        dfs(task.order);
      }
    }
  }
  writeSpec(featureName, taskFolder, content) {
    const specPath = getTaskSpecPath(this.projectRoot, featureName, taskFolder);
    writeText(specPath, content);
    return specPath;
  }
  readSpec(featureName, taskFolder) {
    const specPath = getTaskSpecPath(this.projectRoot, featureName, taskFolder);
    return readText(specPath);
  }
  update(featureName, taskFolder, updates, lockOptions) {
    const statusPath = getTaskStatusPath(this.projectRoot, featureName, taskFolder);
    if (!fileExists(statusPath)) {
      throw new Error(`Task '${taskFolder}' not found`);
    }
    const release = acquireLockSync(statusPath, lockOptions);
    try {
      const current = readJson(statusPath);
      if (!current) {
        throw new Error(`Task '${taskFolder}' not found`);
      }
      const updated = {
        ...current,
        ...updates,
        schemaVersion: TASK_STATUS_SCHEMA_VERSION
      };
      if (updates.status === "in_progress" && !current.startedAt) {
        updated.startedAt = (/* @__PURE__ */ new Date()).toISOString();
      }
      if (updates.status === "done" && !current.completedAt) {
        updated.completedAt = (/* @__PURE__ */ new Date()).toISOString();
      }
      writeJsonAtomic(statusPath, updated);
      return updated;
    } finally {
      release();
    }
  }
  patchBackgroundFields(featureName, taskFolder, patch, lockOptions) {
    const statusPath = getTaskStatusPath(this.projectRoot, featureName, taskFolder);
    const safePatch = {
      schemaVersion: TASK_STATUS_SCHEMA_VERSION
    };
    if (patch.idempotencyKey !== void 0) {
      safePatch.idempotencyKey = patch.idempotencyKey;
    }
    if (patch.workerSession !== void 0) {
      safePatch.workerSession = patch.workerSession;
    }
    return patchJsonLockedSync(statusPath, safePatch, lockOptions);
  }
  getRawStatus(featureName, taskFolder) {
    const statusPath = getTaskStatusPath(this.projectRoot, featureName, taskFolder);
    return readJson(statusPath);
  }
  get(featureName, taskFolder) {
    const statusPath = getTaskStatusPath(this.projectRoot, featureName, taskFolder);
    const status = readJson(statusPath);
    if (!status)
      return null;
    return {
      folder: taskFolder,
      name: taskFolder.replace(/^\d+-/, ""),
      status: status.status,
      origin: status.origin,
      planTitle: status.planTitle,
      summary: status.summary
    };
  }
  list(featureName) {
    const folders = this.listFolders(featureName);
    return folders.map((folder) => this.get(featureName, folder)).filter((t) => t !== null);
  }
  writeReport(featureName, taskFolder, report) {
    const reportPath = getTaskReportPath(this.projectRoot, featureName, taskFolder);
    writeText(reportPath, report);
    return reportPath;
  }
  listFolders(featureName) {
    const tasksPath = getTasksPath(this.projectRoot, featureName);
    if (!fileExists(tasksPath))
      return [];
    return fs5.readdirSync(tasksPath, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
  }
  deleteTask(featureName, taskFolder) {
    const taskPath = getTaskPath(this.projectRoot, featureName, taskFolder);
    if (fileExists(taskPath)) {
      fs5.rmSync(taskPath, { recursive: true });
    }
  }
  getNextOrder(existingFolders) {
    if (existingFolders.length === 0)
      return 1;
    const orders = existingFolders.map((f) => parseInt(f.split("-")[0], 10)).filter((n) => !isNaN(n));
    return Math.max(...orders, 0) + 1;
  }
  parseTasksFromPlan(content) {
    const tasks = [];
    const lines = content.split(`
`);
    let currentTask = null;
    let descriptionLines = [];
    const dependsOnRegex = /^\s*\*{0,2}Depends\s+on\*{0,2}\s*:\s*(.+)$/i;
    for (const line of lines) {
      const taskMatch = line.match(/^###\s+(\d+)\.\s+(.+)$/);
      if (taskMatch) {
        if (currentTask) {
          currentTask.description = descriptionLines.join(`
`).trim();
          tasks.push(currentTask);
        }
        const order = parseInt(taskMatch[1], 10);
        const rawName = taskMatch[2].trim();
        const folderName = rawName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
        const folder = `${String(order).padStart(2, "0")}-${folderName}`;
        currentTask = {
          folder,
          order,
          name: rawName,
          description: "",
          dependsOnNumbers: null
        };
        descriptionLines = [];
      } else if (currentTask) {
        if (line.match(/^##\s+/) || line.match(/^###\s+[^0-9]/)) {
          currentTask.description = descriptionLines.join(`
`).trim();
          tasks.push(currentTask);
          currentTask = null;
          descriptionLines = [];
        } else {
          const dependsMatch = line.match(dependsOnRegex);
          if (dependsMatch) {
            const value = dependsMatch[1].trim().toLowerCase();
            if (value === "none") {
              currentTask.dependsOnNumbers = [];
            } else {
              const numbers = value.split(/[,\s]+/).map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
              currentTask.dependsOnNumbers = numbers;
            }
          }
          descriptionLines.push(line);
        }
      }
    }
    if (currentTask) {
      currentTask.description = descriptionLines.join(`
`).trim();
      tasks.push(currentTask);
    }
    return tasks;
  }
  createSubtask(featureName, taskFolder, name, type) {
    const subtasksPath = getSubtasksPath(this.projectRoot, featureName, taskFolder);
    ensureDir(subtasksPath);
    const existingFolders = this.listSubtaskFolders(featureName, taskFolder);
    const taskOrder = parseInt(taskFolder.split("-")[0], 10);
    const nextOrder = existingFolders.length + 1;
    const subtaskId = `${taskOrder}.${nextOrder}`;
    const folderName = `${nextOrder}-${this.slugify(name)}`;
    const subtaskPath = getSubtaskPath(this.projectRoot, featureName, taskFolder, folderName);
    ensureDir(subtaskPath);
    const subtaskStatus = {
      status: "pending",
      type,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    writeJson(getSubtaskStatusPath(this.projectRoot, featureName, taskFolder, folderName), subtaskStatus);
    const specContent = `# Subtask: ${name}

**Type:** ${type || "custom"}
**ID:** ${subtaskId}

## Instructions

_Add detailed instructions here_
`;
    writeText(getSubtaskSpecPath(this.projectRoot, featureName, taskFolder, folderName), specContent);
    return {
      id: subtaskId,
      name,
      folder: folderName,
      status: "pending",
      type,
      createdAt: subtaskStatus.createdAt
    };
  }
  updateSubtask(featureName, taskFolder, subtaskId, status) {
    const subtaskFolder = this.findSubtaskFolder(featureName, taskFolder, subtaskId);
    if (!subtaskFolder) {
      throw new Error(`Subtask '${subtaskId}' not found in task '${taskFolder}'`);
    }
    const statusPath = getSubtaskStatusPath(this.projectRoot, featureName, taskFolder, subtaskFolder);
    const current = readJson(statusPath);
    if (!current) {
      throw new Error(`Subtask status not found for '${subtaskId}'`);
    }
    const updated = { ...current, status };
    if (status === "done" && !current.completedAt) {
      updated.completedAt = (/* @__PURE__ */ new Date()).toISOString();
    }
    writeJson(statusPath, updated);
    const name = subtaskFolder.replace(/^\d+-/, "");
    return {
      id: subtaskId,
      name,
      folder: subtaskFolder,
      status,
      type: current.type,
      createdAt: current.createdAt,
      completedAt: updated.completedAt
    };
  }
  listSubtasks(featureName, taskFolder) {
    const folders = this.listSubtaskFolders(featureName, taskFolder);
    const taskOrder = parseInt(taskFolder.split("-")[0], 10);
    return folders.map((folder, index) => {
      const statusPath = getSubtaskStatusPath(this.projectRoot, featureName, taskFolder, folder);
      const status = readJson(statusPath);
      const name = folder.replace(/^\d+-/, "");
      const subtaskOrder = parseInt(folder.split("-")[0], 10) || index + 1;
      return {
        id: `${taskOrder}.${subtaskOrder}`,
        name,
        folder,
        status: status?.status || "pending",
        type: status?.type,
        createdAt: status?.createdAt,
        completedAt: status?.completedAt
      };
    });
  }
  deleteSubtask(featureName, taskFolder, subtaskId) {
    const subtaskFolder = this.findSubtaskFolder(featureName, taskFolder, subtaskId);
    if (!subtaskFolder) {
      throw new Error(`Subtask '${subtaskId}' not found in task '${taskFolder}'`);
    }
    const subtaskPath = getSubtaskPath(this.projectRoot, featureName, taskFolder, subtaskFolder);
    if (fileExists(subtaskPath)) {
      fs5.rmSync(subtaskPath, { recursive: true });
    }
  }
  getSubtask(featureName, taskFolder, subtaskId) {
    const subtaskFolder = this.findSubtaskFolder(featureName, taskFolder, subtaskId);
    if (!subtaskFolder)
      return null;
    const statusPath = getSubtaskStatusPath(this.projectRoot, featureName, taskFolder, subtaskFolder);
    const status = readJson(statusPath);
    if (!status)
      return null;
    const taskOrder = parseInt(taskFolder.split("-")[0], 10);
    const subtaskOrder = parseInt(subtaskFolder.split("-")[0], 10);
    const name = subtaskFolder.replace(/^\d+-/, "");
    return {
      id: `${taskOrder}.${subtaskOrder}`,
      name,
      folder: subtaskFolder,
      status: status.status,
      type: status.type,
      createdAt: status.createdAt,
      completedAt: status.completedAt
    };
  }
  writeSubtaskSpec(featureName, taskFolder, subtaskId, content) {
    const subtaskFolder = this.findSubtaskFolder(featureName, taskFolder, subtaskId);
    if (!subtaskFolder) {
      throw new Error(`Subtask '${subtaskId}' not found in task '${taskFolder}'`);
    }
    const specPath = getSubtaskSpecPath(this.projectRoot, featureName, taskFolder, subtaskFolder);
    writeText(specPath, content);
    return specPath;
  }
  writeSubtaskReport(featureName, taskFolder, subtaskId, content) {
    const subtaskFolder = this.findSubtaskFolder(featureName, taskFolder, subtaskId);
    if (!subtaskFolder) {
      throw new Error(`Subtask '${subtaskId}' not found in task '${taskFolder}'`);
    }
    const reportPath = getSubtaskReportPath(this.projectRoot, featureName, taskFolder, subtaskFolder);
    writeText(reportPath, content);
    return reportPath;
  }
  readSubtaskSpec(featureName, taskFolder, subtaskId) {
    const subtaskFolder = this.findSubtaskFolder(featureName, taskFolder, subtaskId);
    if (!subtaskFolder)
      return null;
    const specPath = getSubtaskSpecPath(this.projectRoot, featureName, taskFolder, subtaskFolder);
    return readText(specPath);
  }
  readSubtaskReport(featureName, taskFolder, subtaskId) {
    const subtaskFolder = this.findSubtaskFolder(featureName, taskFolder, subtaskId);
    if (!subtaskFolder)
      return null;
    const reportPath = getSubtaskReportPath(this.projectRoot, featureName, taskFolder, subtaskFolder);
    return readText(reportPath);
  }
  listSubtaskFolders(featureName, taskFolder) {
    const subtasksPath = getSubtasksPath(this.projectRoot, featureName, taskFolder);
    if (!fileExists(subtasksPath))
      return [];
    return fs5.readdirSync(subtasksPath, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
  }
  findSubtaskFolder(featureName, taskFolder, subtaskId) {
    const folders = this.listSubtaskFolders(featureName, taskFolder);
    const subtaskOrder = subtaskId.split(".")[1];
    return folders.find((f) => f.startsWith(`${subtaskOrder}-`)) || null;
  }
  buildManualTaskSpec(featureName, folder, name, dependsOn, metadata) {
    const lines = [
      `# Task: ${folder}`,
      "",
      `## Feature: ${featureName}`,
      "",
      "## Dependencies",
      ""
    ];
    if (dependsOn.length > 0) {
      for (const dep of dependsOn) {
        lines.push(`- ${dep}`);
      }
    } else {
      lines.push("_None_");
    }
    lines.push("");
    if (metadata?.goal) {
      lines.push("## Goal", "", metadata.goal, "");
    }
    if (metadata?.description) {
      lines.push("## Description", "", metadata.description, "");
    }
    if (metadata?.acceptanceCriteria && metadata.acceptanceCriteria.length > 0) {
      lines.push("## Acceptance Criteria", "");
      for (const criterion of metadata.acceptanceCriteria) {
        lines.push(`- ${criterion}`);
      }
      lines.push("");
    }
    if (metadata?.files && metadata.files.length > 0) {
      lines.push("## Files", "");
      for (const file of metadata.files) {
        lines.push(`- ${file}`);
      }
      lines.push("");
    }
    if (metadata?.references && metadata.references.length > 0) {
      lines.push("## References", "");
      for (const ref of metadata.references) {
        lines.push(`- ${ref}`);
      }
      lines.push("");
    }
    if (metadata?.source || metadata?.reason) {
      lines.push("## Origin", "");
      if (metadata?.source) {
        lines.push(`**Source:** ${metadata.source}`);
      }
      if (metadata?.reason) {
        lines.push(`**Reason:** ${metadata.reason}`);
      }
      lines.push("");
    }
    return lines.join(`
`);
  }
  slugify(name) {
    return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  }
};
var import_file_exists = __toESM2(require_dist(), 1);
var import_debug = __toESM2(require_src(), 1);
var import_promise_deferred = __toESM2(require_dist2(), 1);
var import_promise_deferred2 = __toESM2(require_dist2(), 1);
var __defProp22 = Object.defineProperty;
var __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
var __getOwnPropNames22 = Object.getOwnPropertyNames;
var __hasOwnProp22 = Object.prototype.hasOwnProperty;
var __esm2 = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames22(fn)[0]])(fn = 0)), res;
};
var __commonJS2 = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames22(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export2 = (target, all) => {
  for (var name in all)
    __defProp22(target, name, { get: all[name], enumerable: true });
};
var __copyProps2 = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames22(from))
      if (!__hasOwnProp22.call(to, key) && key !== except)
        __defProp22(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc2(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS2 = (mod) => __copyProps2(__defProp22({}, "__esModule", { value: true }), mod);
function pathspec(...paths) {
  const key = new String(paths);
  cache.set(key, paths);
  return key;
}
function isPathSpec(path42) {
  return path42 instanceof String && cache.has(path42);
}
function toPaths(pathSpec) {
  return cache.get(pathSpec) || [];
}
var cache;
var init_pathspec = __esm2({
  "src/lib/args/pathspec.ts"() {
    cache = /* @__PURE__ */ new WeakMap();
  }
});
var GitError;
var init_git_error = __esm2({
  "src/lib/errors/git-error.ts"() {
    GitError = class extends Error {
      constructor(task, message) {
        super(message);
        this.task = task;
        Object.setPrototypeOf(this, new.target.prototype);
      }
    };
  }
});
var GitResponseError;
var init_git_response_error = __esm2({
  "src/lib/errors/git-response-error.ts"() {
    init_git_error();
    GitResponseError = class extends GitError {
      constructor(git, message) {
        super(void 0, message || String(git));
        this.git = git;
      }
    };
  }
});
var TaskConfigurationError;
var init_task_configuration_error = __esm2({
  "src/lib/errors/task-configuration-error.ts"() {
    init_git_error();
    TaskConfigurationError = class extends GitError {
      constructor(message) {
        super(void 0, message);
      }
    };
  }
});
function asFunction(source) {
  if (typeof source !== "function") {
    return NOOP;
  }
  return source;
}
function isUserFunction(source) {
  return typeof source === "function" && source !== NOOP;
}
function splitOn(input, char) {
  const index = input.indexOf(char);
  if (index <= 0) {
    return [input, ""];
  }
  return [input.substr(0, index), input.substr(index + 1)];
}
function first(input, offset = 0) {
  return isArrayLike(input) && input.length > offset ? input[offset] : void 0;
}
function last(input, offset = 0) {
  if (isArrayLike(input) && input.length > offset) {
    return input[input.length - 1 - offset];
  }
}
function isArrayLike(input) {
  return filterHasLength(input);
}
function toLinesWithContent(input = "", trimmed2 = true, separator = `
`) {
  return input.split(separator).reduce((output, line) => {
    const lineContent = trimmed2 ? line.trim() : line;
    if (lineContent) {
      output.push(lineContent);
    }
    return output;
  }, []);
}
function forEachLineWithContent(input, callback) {
  return toLinesWithContent(input, true).map((line) => callback(line));
}
function folderExists(path42) {
  return import_file_exists.exists(path42, import_file_exists.FOLDER);
}
function append(target, item) {
  if (Array.isArray(target)) {
    if (!target.includes(item)) {
      target.push(item);
    }
  } else {
    target.add(item);
  }
  return item;
}
function including(target, item) {
  if (Array.isArray(target) && !target.includes(item)) {
    target.push(item);
  }
  return target;
}
function remove(target, item) {
  if (Array.isArray(target)) {
    const index = target.indexOf(item);
    if (index >= 0) {
      target.splice(index, 1);
    }
  } else {
    target.delete(item);
  }
  return item;
}
function asArray(source) {
  return Array.isArray(source) ? source : [source];
}
function asCamelCase(str) {
  return str.replace(/[\s-]+(.)/g, (_all, chr) => {
    return chr.toUpperCase();
  });
}
function asStringArray(source) {
  return asArray(source).map((item) => {
    return item instanceof String ? item : String(item);
  });
}
function asNumber(source, onNaN = 0) {
  if (source == null) {
    return onNaN;
  }
  const num = parseInt(source, 10);
  return Number.isNaN(num) ? onNaN : num;
}
function prefixedArray(input, prefix) {
  const output = [];
  for (let i = 0, max = input.length; i < max; i++) {
    output.push(prefix, input[i]);
  }
  return output;
}
function bufferToString(input) {
  return (Array.isArray(input) ? import_node_buffer.Buffer.concat(input) : input).toString("utf-8");
}
function pick(source, properties) {
  const out = {};
  properties.forEach((key) => {
    if (source[key] !== void 0) {
      out[key] = source[key];
    }
  });
  return out;
}
function delay(duration = 0) {
  return new Promise((done) => setTimeout(done, duration));
}
function orVoid(input) {
  if (input === false) {
    return;
  }
  return input;
}
var NULL;
var NOOP;
var objectToString;
var init_util = __esm2({
  "src/lib/utils/util.ts"() {
    init_argument_filters();
    NULL = "\0";
    NOOP = () => {
    };
    objectToString = Object.prototype.toString.call.bind(Object.prototype.toString);
  }
});
function filterType(input, filter, def) {
  if (filter(input)) {
    return input;
  }
  return arguments.length > 2 ? def : void 0;
}
function filterPrimitives(input, omit) {
  const type = isPathSpec(input) ? "string" : typeof input;
  return /number|string|boolean/.test(type) && (!omit || !omit.includes(type));
}
function filterPlainObject(input) {
  return !!input && objectToString(input) === "[object Object]";
}
function filterFunction(input) {
  return typeof input === "function";
}
var filterArray;
var filterNumber;
var filterString;
var filterStringOrStringArray;
var filterHasLength;
var init_argument_filters = __esm2({
  "src/lib/utils/argument-filters.ts"() {
    init_pathspec();
    init_util();
    filterArray = (input) => {
      return Array.isArray(input);
    };
    filterNumber = (input) => {
      return typeof input === "number";
    };
    filterString = (input) => {
      return typeof input === "string" || isPathSpec(input);
    };
    filterStringOrStringArray = (input) => {
      return filterString(input) || Array.isArray(input) && input.every(filterString);
    };
    filterHasLength = (input) => {
      if (input == null || "number|boolean|function".includes(typeof input)) {
        return false;
      }
      return typeof input.length === "number";
    };
  }
});
var ExitCodes;
var init_exit_codes = __esm2({
  "src/lib/utils/exit-codes.ts"() {
    ExitCodes = /* @__PURE__ */ ((ExitCodes2) => {
      ExitCodes2[ExitCodes2["SUCCESS"] = 0] = "SUCCESS";
      ExitCodes2[ExitCodes2["ERROR"] = 1] = "ERROR";
      ExitCodes2[ExitCodes2["NOT_FOUND"] = -2] = "NOT_FOUND";
      ExitCodes2[ExitCodes2["UNCLEAN"] = 128] = "UNCLEAN";
      return ExitCodes2;
    })(ExitCodes || {});
  }
});
var GitOutputStreams;
var init_git_output_streams = __esm2({
  "src/lib/utils/git-output-streams.ts"() {
    GitOutputStreams = class _GitOutputStreams {
      constructor(stdOut, stdErr) {
        this.stdOut = stdOut;
        this.stdErr = stdErr;
      }
      asStrings() {
        return new _GitOutputStreams(this.stdOut.toString("utf8"), this.stdErr.toString("utf8"));
      }
    };
  }
});
function useMatchesDefault() {
  throw new Error(`LineParser:useMatches not implemented`);
}
var LineParser;
var RemoteLineParser;
var init_line_parser = __esm2({
  "src/lib/utils/line-parser.ts"() {
    LineParser = class {
      constructor(regExp, useMatches) {
        this.matches = [];
        this.useMatches = useMatchesDefault;
        this.parse = (line, target) => {
          this.resetMatches();
          if (!this._regExp.every((reg, index) => this.addMatch(reg, index, line(index)))) {
            return false;
          }
          return this.useMatches(target, this.prepareMatches()) !== false;
        };
        this._regExp = Array.isArray(regExp) ? regExp : [regExp];
        if (useMatches) {
          this.useMatches = useMatches;
        }
      }
      resetMatches() {
        this.matches.length = 0;
      }
      prepareMatches() {
        return this.matches;
      }
      addMatch(reg, index, line) {
        const matched = line && reg.exec(line);
        if (matched) {
          this.pushMatch(index, matched);
        }
        return !!matched;
      }
      pushMatch(_index, matched) {
        this.matches.push(...matched.slice(1));
      }
    };
    RemoteLineParser = class extends LineParser {
      addMatch(reg, index, line) {
        return /^remote:\s/.test(String(line)) && super.addMatch(reg, index, line);
      }
      pushMatch(index, matched) {
        if (index > 0 || matched.length > 1) {
          super.pushMatch(index, matched);
        }
      }
    };
  }
});
function createInstanceConfig(...options) {
  const baseDir = process.cwd();
  const config = Object.assign({ baseDir, ...defaultOptions }, ...options.filter((o) => typeof o === "object" && o));
  config.baseDir = config.baseDir || baseDir;
  config.trimmed = config.trimmed === true;
  return config;
}
var defaultOptions;
var init_simple_git_options = __esm2({
  "src/lib/utils/simple-git-options.ts"() {
    defaultOptions = {
      binary: "git",
      maxConcurrentProcesses: 5,
      config: [],
      trimmed: false
    };
  }
});
function appendTaskOptions(options, commands4 = []) {
  if (!filterPlainObject(options)) {
    return commands4;
  }
  return Object.keys(options).reduce((commands22, key) => {
    const value = options[key];
    if (isPathSpec(value)) {
      commands22.push(value);
    } else if (filterPrimitives(value, ["boolean"])) {
      commands22.push(key + "=" + value);
    } else if (Array.isArray(value)) {
      for (const v of value) {
        if (!filterPrimitives(v, ["string", "number"])) {
          commands22.push(key + "=" + v);
        }
      }
    } else {
      commands22.push(key);
    }
    return commands22;
  }, commands4);
}
function getTrailingOptions(args, initialPrimitive = 0, objectOnly = false) {
  const command = [];
  for (let i = 0, max = initialPrimitive < 0 ? args.length : initialPrimitive; i < max; i++) {
    if ("string|number".includes(typeof args[i])) {
      command.push(String(args[i]));
    }
  }
  appendTaskOptions(trailingOptionsArgument(args), command);
  if (!objectOnly) {
    command.push(...trailingArrayArgument(args));
  }
  return command;
}
function trailingArrayArgument(args) {
  const hasTrailingCallback = typeof last(args) === "function";
  return asStringArray(filterType(last(args, hasTrailingCallback ? 1 : 0), filterArray, []));
}
function trailingOptionsArgument(args) {
  const hasTrailingCallback = filterFunction(last(args));
  return filterType(last(args, hasTrailingCallback ? 1 : 0), filterPlainObject);
}
function trailingFunctionArgument(args, includeNoop = true) {
  const callback = asFunction(last(args));
  return includeNoop || isUserFunction(callback) ? callback : void 0;
}
var init_task_options = __esm2({
  "src/lib/utils/task-options.ts"() {
    init_argument_filters();
    init_util();
    init_pathspec();
  }
});
function callTaskParser(parser4, streams) {
  return parser4(streams.stdOut, streams.stdErr);
}
function parseStringResponse(result, parsers12, texts, trim = true) {
  asArray(texts).forEach((text) => {
    for (let lines = toLinesWithContent(text, trim), i = 0, max = lines.length; i < max; i++) {
      const line = (offset = 0) => {
        if (i + offset >= max) {
          return;
        }
        return lines[i + offset];
      };
      parsers12.some(({ parse: parse2 }) => parse2(line, result));
    }
  });
  return result;
}
var init_task_parser = __esm2({
  "src/lib/utils/task-parser.ts"() {
    init_util();
  }
});
var utils_exports = {};
__export2(utils_exports, {
  ExitCodes: () => ExitCodes,
  GitOutputStreams: () => GitOutputStreams,
  LineParser: () => LineParser,
  NOOP: () => NOOP,
  NULL: () => NULL,
  RemoteLineParser: () => RemoteLineParser,
  append: () => append,
  appendTaskOptions: () => appendTaskOptions,
  asArray: () => asArray,
  asCamelCase: () => asCamelCase,
  asFunction: () => asFunction,
  asNumber: () => asNumber,
  asStringArray: () => asStringArray,
  bufferToString: () => bufferToString,
  callTaskParser: () => callTaskParser,
  createInstanceConfig: () => createInstanceConfig,
  delay: () => delay,
  filterArray: () => filterArray,
  filterFunction: () => filterFunction,
  filterHasLength: () => filterHasLength,
  filterNumber: () => filterNumber,
  filterPlainObject: () => filterPlainObject,
  filterPrimitives: () => filterPrimitives,
  filterString: () => filterString,
  filterStringOrStringArray: () => filterStringOrStringArray,
  filterType: () => filterType,
  first: () => first,
  folderExists: () => folderExists,
  forEachLineWithContent: () => forEachLineWithContent,
  getTrailingOptions: () => getTrailingOptions,
  including: () => including,
  isUserFunction: () => isUserFunction,
  last: () => last,
  objectToString: () => objectToString,
  orVoid: () => orVoid,
  parseStringResponse: () => parseStringResponse,
  pick: () => pick,
  prefixedArray: () => prefixedArray,
  remove: () => remove,
  splitOn: () => splitOn,
  toLinesWithContent: () => toLinesWithContent,
  trailingFunctionArgument: () => trailingFunctionArgument,
  trailingOptionsArgument: () => trailingOptionsArgument
});
var init_utils = __esm2({
  "src/lib/utils/index.ts"() {
    init_argument_filters();
    init_exit_codes();
    init_git_output_streams();
    init_line_parser();
    init_simple_git_options();
    init_task_options();
    init_task_parser();
    init_util();
  }
});
var check_is_repo_exports = {};
__export2(check_is_repo_exports, {
  CheckRepoActions: () => CheckRepoActions,
  checkIsBareRepoTask: () => checkIsBareRepoTask,
  checkIsRepoRootTask: () => checkIsRepoRootTask,
  checkIsRepoTask: () => checkIsRepoTask
});
function checkIsRepoTask(action) {
  switch (action) {
    case "bare":
      return checkIsBareRepoTask();
    case "root":
      return checkIsRepoRootTask();
  }
  const commands4 = ["rev-parse", "--is-inside-work-tree"];
  return {
    commands: commands4,
    format: "utf-8",
    onError,
    parser
  };
}
function checkIsRepoRootTask() {
  const commands4 = ["rev-parse", "--git-dir"];
  return {
    commands: commands4,
    format: "utf-8",
    onError,
    parser(path42) {
      return /^\.(git)?$/.test(path42.trim());
    }
  };
}
function checkIsBareRepoTask() {
  const commands4 = ["rev-parse", "--is-bare-repository"];
  return {
    commands: commands4,
    format: "utf-8",
    onError,
    parser
  };
}
function isNotRepoMessage(error) {
  return /(Not a git repository|Kein Git-Repository)/i.test(String(error));
}
var CheckRepoActions;
var onError;
var parser;
var init_check_is_repo = __esm2({
  "src/lib/tasks/check-is-repo.ts"() {
    init_utils();
    CheckRepoActions = /* @__PURE__ */ ((CheckRepoActions2) => {
      CheckRepoActions2["BARE"] = "bare";
      CheckRepoActions2["IN_TREE"] = "tree";
      CheckRepoActions2["IS_REPO_ROOT"] = "root";
      return CheckRepoActions2;
    })(CheckRepoActions || {});
    onError = ({ exitCode }, error, done, fail) => {
      if (exitCode === 128 && isNotRepoMessage(error)) {
        return done(Buffer.from("false"));
      }
      fail(error);
    };
    parser = (text) => {
      return text.trim() === "true";
    };
  }
});
function cleanSummaryParser(dryRun, text) {
  const summary = new CleanResponse(dryRun);
  const regexp = dryRun ? dryRunRemovalRegexp : removalRegexp;
  toLinesWithContent(text).forEach((line) => {
    const removed = line.replace(regexp, "");
    summary.paths.push(removed);
    (isFolderRegexp.test(removed) ? summary.folders : summary.files).push(removed);
  });
  return summary;
}
var CleanResponse;
var removalRegexp;
var dryRunRemovalRegexp;
var isFolderRegexp;
var init_CleanSummary = __esm2({
  "src/lib/responses/CleanSummary.ts"() {
    init_utils();
    CleanResponse = class {
      constructor(dryRun) {
        this.dryRun = dryRun;
        this.paths = [];
        this.files = [];
        this.folders = [];
      }
    };
    removalRegexp = /^[a-z]+\s*/i;
    dryRunRemovalRegexp = /^[a-z]+\s+[a-z]+\s*/i;
    isFolderRegexp = /\/$/;
  }
});
var task_exports = {};
__export2(task_exports, {
  EMPTY_COMMANDS: () => EMPTY_COMMANDS,
  adhocExecTask: () => adhocExecTask,
  configurationErrorTask: () => configurationErrorTask,
  isBufferTask: () => isBufferTask,
  isEmptyTask: () => isEmptyTask,
  straightThroughBufferTask: () => straightThroughBufferTask,
  straightThroughStringTask: () => straightThroughStringTask
});
function adhocExecTask(parser4) {
  return {
    commands: EMPTY_COMMANDS,
    format: "empty",
    parser: parser4
  };
}
function configurationErrorTask(error) {
  return {
    commands: EMPTY_COMMANDS,
    format: "empty",
    parser() {
      throw typeof error === "string" ? new TaskConfigurationError(error) : error;
    }
  };
}
function straightThroughStringTask(commands4, trimmed2 = false) {
  return {
    commands: commands4,
    format: "utf-8",
    parser(text) {
      return trimmed2 ? String(text).trim() : text;
    }
  };
}
function straightThroughBufferTask(commands4) {
  return {
    commands: commands4,
    format: "buffer",
    parser(buffer) {
      return buffer;
    }
  };
}
function isBufferTask(task) {
  return task.format === "buffer";
}
function isEmptyTask(task) {
  return task.format === "empty" || !task.commands.length;
}
var EMPTY_COMMANDS;
var init_task = __esm2({
  "src/lib/tasks/task.ts"() {
    init_task_configuration_error();
    EMPTY_COMMANDS = [];
  }
});
var clean_exports = {};
__export2(clean_exports, {
  CONFIG_ERROR_INTERACTIVE_MODE: () => CONFIG_ERROR_INTERACTIVE_MODE,
  CONFIG_ERROR_MODE_REQUIRED: () => CONFIG_ERROR_MODE_REQUIRED,
  CONFIG_ERROR_UNKNOWN_OPTION: () => CONFIG_ERROR_UNKNOWN_OPTION,
  CleanOptions: () => CleanOptions,
  cleanTask: () => cleanTask,
  cleanWithOptionsTask: () => cleanWithOptionsTask,
  isCleanOptionsArray: () => isCleanOptionsArray
});
function cleanWithOptionsTask(mode, customArgs) {
  const { cleanMode, options, valid } = getCleanOptions(mode);
  if (!cleanMode) {
    return configurationErrorTask(CONFIG_ERROR_MODE_REQUIRED);
  }
  if (!valid.options) {
    return configurationErrorTask(CONFIG_ERROR_UNKNOWN_OPTION + JSON.stringify(mode));
  }
  options.push(...customArgs);
  if (options.some(isInteractiveMode)) {
    return configurationErrorTask(CONFIG_ERROR_INTERACTIVE_MODE);
  }
  return cleanTask(cleanMode, options);
}
function cleanTask(mode, customArgs) {
  const commands4 = ["clean", `-${mode}`, ...customArgs];
  return {
    commands: commands4,
    format: "utf-8",
    parser(text) {
      return cleanSummaryParser(mode === "n", text);
    }
  };
}
function isCleanOptionsArray(input) {
  return Array.isArray(input) && input.every((test) => CleanOptionValues.has(test));
}
function getCleanOptions(input) {
  let cleanMode;
  let options = [];
  let valid = { cleanMode: false, options: true };
  input.replace(/[^a-z]i/g, "").split("").forEach((char) => {
    if (isCleanMode(char)) {
      cleanMode = char;
      valid.cleanMode = true;
    } else {
      valid.options = valid.options && isKnownOption(options[options.length] = `-${char}`);
    }
  });
  return {
    cleanMode,
    options,
    valid
  };
}
function isCleanMode(cleanMode) {
  return cleanMode === "f" || cleanMode === "n";
}
function isKnownOption(option) {
  return /^-[a-z]$/i.test(option) && CleanOptionValues.has(option.charAt(1));
}
function isInteractiveMode(option) {
  if (/^-[^\-]/.test(option)) {
    return option.indexOf("i") > 0;
  }
  return option === "--interactive";
}
var CONFIG_ERROR_INTERACTIVE_MODE;
var CONFIG_ERROR_MODE_REQUIRED;
var CONFIG_ERROR_UNKNOWN_OPTION;
var CleanOptions;
var CleanOptionValues;
var init_clean = __esm2({
  "src/lib/tasks/clean.ts"() {
    init_CleanSummary();
    init_utils();
    init_task();
    CONFIG_ERROR_INTERACTIVE_MODE = "Git clean interactive mode is not supported";
    CONFIG_ERROR_MODE_REQUIRED = 'Git clean mode parameter ("n" or "f") is required';
    CONFIG_ERROR_UNKNOWN_OPTION = "Git clean unknown option found in: ";
    CleanOptions = /* @__PURE__ */ ((CleanOptions2) => {
      CleanOptions2["DRY_RUN"] = "n";
      CleanOptions2["FORCE"] = "f";
      CleanOptions2["IGNORED_INCLUDED"] = "x";
      CleanOptions2["IGNORED_ONLY"] = "X";
      CleanOptions2["EXCLUDING"] = "e";
      CleanOptions2["QUIET"] = "q";
      CleanOptions2["RECURSIVE"] = "d";
      return CleanOptions2;
    })(CleanOptions || {});
    CleanOptionValues = /* @__PURE__ */ new Set([
      "i",
      ...asStringArray(Object.values(CleanOptions))
    ]);
  }
});
function configListParser(text) {
  const config = new ConfigList();
  for (const item of configParser(text)) {
    config.addValue(item.file, String(item.key), item.value);
  }
  return config;
}
function configGetParser(text, key) {
  let value = null;
  const values = [];
  const scopes = /* @__PURE__ */ new Map();
  for (const item of configParser(text, key)) {
    if (item.key !== key) {
      continue;
    }
    values.push(value = item.value);
    if (!scopes.has(item.file)) {
      scopes.set(item.file, []);
    }
    scopes.get(item.file).push(value);
  }
  return {
    key,
    paths: Array.from(scopes.keys()),
    scopes,
    value,
    values
  };
}
function configFilePath(filePath) {
  return filePath.replace(/^(file):/, "");
}
function* configParser(text, requestedKey = null) {
  const lines = text.split("\0");
  for (let i = 0, max = lines.length - 1; i < max; ) {
    const file = configFilePath(lines[i++]);
    let value = lines[i++];
    let key = requestedKey;
    if (value.includes(`
`)) {
      const line = splitOn(value, `
`);
      key = line[0];
      value = line[1];
    }
    yield { file, key, value };
  }
}
var ConfigList;
var init_ConfigList = __esm2({
  "src/lib/responses/ConfigList.ts"() {
    init_utils();
    ConfigList = class {
      constructor() {
        this.files = [];
        this.values = /* @__PURE__ */ Object.create(null);
      }
      get all() {
        if (!this._all) {
          this._all = this.files.reduce((all, file) => {
            return Object.assign(all, this.values[file]);
          }, {});
        }
        return this._all;
      }
      addFile(file) {
        if (!(file in this.values)) {
          const latest = last(this.files);
          this.values[file] = latest ? Object.create(this.values[latest]) : {};
          this.files.push(file);
        }
        return this.values[file];
      }
      addValue(file, key, value) {
        const values = this.addFile(file);
        if (!Object.hasOwn(values, key)) {
          values[key] = value;
        } else if (Array.isArray(values[key])) {
          values[key].push(value);
        } else {
          values[key] = [values[key], value];
        }
        this._all = void 0;
      }
    };
  }
});
function asConfigScope(scope, fallback) {
  if (typeof scope === "string" && Object.hasOwn(GitConfigScope, scope)) {
    return scope;
  }
  return fallback;
}
function addConfigTask(key, value, append2, scope) {
  const commands4 = ["config", `--${scope}`];
  if (append2) {
    commands4.push("--add");
  }
  commands4.push(key, value);
  return {
    commands: commands4,
    format: "utf-8",
    parser(text) {
      return text;
    }
  };
}
function getConfigTask(key, scope) {
  const commands4 = ["config", "--null", "--show-origin", "--get-all", key];
  if (scope) {
    commands4.splice(1, 0, `--${scope}`);
  }
  return {
    commands: commands4,
    format: "utf-8",
    parser(text) {
      return configGetParser(text, key);
    }
  };
}
function listConfigTask(scope) {
  const commands4 = ["config", "--list", "--show-origin", "--null"];
  if (scope) {
    commands4.push(`--${scope}`);
  }
  return {
    commands: commands4,
    format: "utf-8",
    parser(text) {
      return configListParser(text);
    }
  };
}
function config_default() {
  return {
    addConfig(key, value, ...rest) {
      return this._runTask(addConfigTask(key, value, rest[0] === true, asConfigScope(rest[1], "local")), trailingFunctionArgument(arguments));
    },
    getConfig(key, scope) {
      return this._runTask(getConfigTask(key, asConfigScope(scope, void 0)), trailingFunctionArgument(arguments));
    },
    listConfig(...rest) {
      return this._runTask(listConfigTask(asConfigScope(rest[0], void 0)), trailingFunctionArgument(arguments));
    }
  };
}
var GitConfigScope;
var init_config = __esm2({
  "src/lib/tasks/config.ts"() {
    init_ConfigList();
    init_utils();
    GitConfigScope = /* @__PURE__ */ ((GitConfigScope2) => {
      GitConfigScope2["system"] = "system";
      GitConfigScope2["global"] = "global";
      GitConfigScope2["local"] = "local";
      GitConfigScope2["worktree"] = "worktree";
      return GitConfigScope2;
    })(GitConfigScope || {});
  }
});
function isDiffNameStatus(input) {
  return diffNameStatus.has(input);
}
var DiffNameStatus;
var diffNameStatus;
var init_diff_name_status = __esm2({
  "src/lib/tasks/diff-name-status.ts"() {
    DiffNameStatus = /* @__PURE__ */ ((DiffNameStatus2) => {
      DiffNameStatus2["ADDED"] = "A";
      DiffNameStatus2["COPIED"] = "C";
      DiffNameStatus2["DELETED"] = "D";
      DiffNameStatus2["MODIFIED"] = "M";
      DiffNameStatus2["RENAMED"] = "R";
      DiffNameStatus2["CHANGED"] = "T";
      DiffNameStatus2["UNMERGED"] = "U";
      DiffNameStatus2["UNKNOWN"] = "X";
      DiffNameStatus2["BROKEN"] = "B";
      return DiffNameStatus2;
    })(DiffNameStatus || {});
    diffNameStatus = new Set(Object.values(DiffNameStatus));
  }
});
function grepQueryBuilder(...params) {
  return new GrepQuery().param(...params);
}
function parseGrep(grep) {
  const paths = /* @__PURE__ */ new Set();
  const results = {};
  forEachLineWithContent(grep, (input) => {
    const [path42, line, preview] = input.split(NULL);
    paths.add(path42);
    (results[path42] = results[path42] || []).push({
      line: asNumber(line),
      path: path42,
      preview
    });
  });
  return {
    paths,
    results
  };
}
function grep_default() {
  return {
    grep(searchTerm) {
      const then = trailingFunctionArgument(arguments);
      const options = getTrailingOptions(arguments);
      for (const option of disallowedOptions) {
        if (options.includes(option)) {
          return this._runTask(configurationErrorTask(`git.grep: use of "${option}" is not supported.`), then);
        }
      }
      if (typeof searchTerm === "string") {
        searchTerm = grepQueryBuilder().param(searchTerm);
      }
      const commands4 = ["grep", "--null", "-n", "--full-name", ...options, ...searchTerm];
      return this._runTask({
        commands: commands4,
        format: "utf-8",
        parser(stdOut) {
          return parseGrep(stdOut);
        }
      }, then);
    }
  };
}
var disallowedOptions;
var Query;
var _a;
var GrepQuery;
var init_grep = __esm2({
  "src/lib/tasks/grep.ts"() {
    init_utils();
    init_task();
    disallowedOptions = ["-h"];
    Query = /* @__PURE__ */ Symbol("grepQuery");
    GrepQuery = class {
      constructor() {
        this[_a] = [];
      }
      *[(_a = Query, Symbol.iterator)]() {
        for (const query of this[Query]) {
          yield query;
        }
      }
      and(...and) {
        and.length && this[Query].push("--and", "(", ...prefixedArray(and, "-e"), ")");
        return this;
      }
      param(...param) {
        this[Query].push(...prefixedArray(param, "-e"));
        return this;
      }
    };
  }
});
var reset_exports = {};
__export2(reset_exports, {
  ResetMode: () => ResetMode,
  getResetMode: () => getResetMode,
  resetTask: () => resetTask
});
function resetTask(mode, customArgs) {
  const commands4 = ["reset"];
  if (isValidResetMode(mode)) {
    commands4.push(`--${mode}`);
  }
  commands4.push(...customArgs);
  return straightThroughStringTask(commands4);
}
function getResetMode(mode) {
  if (isValidResetMode(mode)) {
    return mode;
  }
  switch (typeof mode) {
    case "string":
    case "undefined":
      return "soft";
  }
  return;
}
function isValidResetMode(mode) {
  return typeof mode === "string" && validResetModes.includes(mode);
}
var ResetMode;
var validResetModes;
var init_reset = __esm2({
  "src/lib/tasks/reset.ts"() {
    init_utils();
    init_task();
    ResetMode = /* @__PURE__ */ ((ResetMode2) => {
      ResetMode2["MIXED"] = "mixed";
      ResetMode2["SOFT"] = "soft";
      ResetMode2["HARD"] = "hard";
      ResetMode2["MERGE"] = "merge";
      ResetMode2["KEEP"] = "keep";
      return ResetMode2;
    })(ResetMode || {});
    validResetModes = asStringArray(Object.values(ResetMode));
  }
});
function createLog() {
  return import_debug.default("simple-git");
}
function prefixedLogger(to, prefix, forward) {
  if (!prefix || !String(prefix).replace(/\s*/, "")) {
    return !forward ? to : (message, ...args) => {
      to(message, ...args);
      forward(message, ...args);
    };
  }
  return (message, ...args) => {
    to(`%s ${message}`, prefix, ...args);
    if (forward) {
      forward(message, ...args);
    }
  };
}
function childLoggerName(name, childDebugger, { namespace: parentNamespace }) {
  if (typeof name === "string") {
    return name;
  }
  const childNamespace = childDebugger && childDebugger.namespace || "";
  if (childNamespace.startsWith(parentNamespace)) {
    return childNamespace.substr(parentNamespace.length + 1);
  }
  return childNamespace || parentNamespace;
}
function createLogger(label, verbose, initialStep, infoDebugger = createLog()) {
  const labelPrefix = label && `[${label}]` || "";
  const spawned = [];
  const debugDebugger = typeof verbose === "string" ? infoDebugger.extend(verbose) : verbose;
  const key = childLoggerName(filterType(verbose, filterString), debugDebugger, infoDebugger);
  return step(initialStep);
  function sibling(name, initial) {
    return append(spawned, createLogger(label, key.replace(/^[^:]+/, name), initial, infoDebugger));
  }
  function step(phase) {
    const stepPrefix = phase && `[${phase}]` || "";
    const debug2 = debugDebugger && prefixedLogger(debugDebugger, stepPrefix) || NOOP;
    const info = prefixedLogger(infoDebugger, `${labelPrefix} ${stepPrefix}`, debug2);
    return Object.assign(debugDebugger ? debug2 : info, {
      label,
      sibling,
      info,
      step
    });
  }
}
var init_git_logger = __esm2({
  "src/lib/git-logger.ts"() {
    init_utils();
    import_debug.default.formatters.L = (value) => String(filterHasLength(value) ? value.length : "-");
    import_debug.default.formatters.B = (value) => {
      if (Buffer.isBuffer(value)) {
        return value.toString("utf8");
      }
      return objectToString(value);
    };
  }
});
var TasksPendingQueue;
var init_tasks_pending_queue = __esm2({
  "src/lib/runners/tasks-pending-queue.ts"() {
    init_git_error();
    init_git_logger();
    TasksPendingQueue = class _TasksPendingQueue {
      constructor(logLabel = "GitExecutor") {
        this.logLabel = logLabel;
        this._queue = /* @__PURE__ */ new Map();
      }
      withProgress(task) {
        return this._queue.get(task);
      }
      createProgress(task) {
        const name = _TasksPendingQueue.getName(task.commands[0]);
        const logger = createLogger(this.logLabel, name);
        return {
          task,
          logger,
          name
        };
      }
      push(task) {
        const progress = this.createProgress(task);
        progress.logger("Adding task to the queue, commands = %o", task.commands);
        this._queue.set(task, progress);
        return progress;
      }
      fatal(err) {
        for (const [task, { logger }] of Array.from(this._queue.entries())) {
          if (task === err.task) {
            logger.info(`Failed %o`, err);
            logger(`Fatal exception, any as-yet un-started tasks run through this executor will not be attempted`);
          } else {
            logger.info(`A fatal exception occurred in a previous task, the queue has been purged: %o`, err.message);
          }
          this.complete(task);
        }
        if (this._queue.size !== 0) {
          throw new Error(`Queue size should be zero after fatal: ${this._queue.size}`);
        }
      }
      complete(task) {
        const progress = this.withProgress(task);
        if (progress) {
          this._queue.delete(task);
        }
      }
      attempt(task) {
        const progress = this.withProgress(task);
        if (!progress) {
          throw new GitError(void 0, "TasksPendingQueue: attempt called for an unknown task");
        }
        progress.logger("Starting task");
        return progress;
      }
      static getName(name = "empty") {
        return `task:${name}:${++_TasksPendingQueue.counter}`;
      }
      static {
        this.counter = 0;
      }
    };
  }
});
function pluginContext(task, commands4) {
  return {
    method: first(task.commands) || "",
    commands: commands4
  };
}
function onErrorReceived(target, logger) {
  return (err) => {
    logger(`[ERROR] child process exception %o`, err);
    target.push(Buffer.from(String(err.stack), "ascii"));
  };
}
function onDataReceived(target, name, logger, output) {
  return (buffer) => {
    logger(`%s received %L bytes`, name, buffer);
    output(`%B`, buffer);
    target.push(buffer);
  };
}
var GitExecutorChain;
var init_git_executor_chain = __esm2({
  "src/lib/runners/git-executor-chain.ts"() {
    init_git_error();
    init_task();
    init_utils();
    init_tasks_pending_queue();
    GitExecutorChain = class {
      constructor(_executor, _scheduler, _plugins) {
        this._executor = _executor;
        this._scheduler = _scheduler;
        this._plugins = _plugins;
        this._chain = Promise.resolve();
        this._queue = new TasksPendingQueue();
      }
      get cwd() {
        return this._cwd || this._executor.cwd;
      }
      set cwd(cwd) {
        this._cwd = cwd;
      }
      get env() {
        return this._executor.env;
      }
      get outputHandler() {
        return this._executor.outputHandler;
      }
      chain() {
        return this;
      }
      push(task) {
        this._queue.push(task);
        return this._chain = this._chain.then(() => this.attemptTask(task));
      }
      async attemptTask(task) {
        const onScheduleComplete = await this._scheduler.next();
        const onQueueComplete = () => this._queue.complete(task);
        try {
          const { logger } = this._queue.attempt(task);
          return await (isEmptyTask(task) ? this.attemptEmptyTask(task, logger) : this.attemptRemoteTask(task, logger));
        } catch (e) {
          throw this.onFatalException(task, e);
        } finally {
          onQueueComplete();
          onScheduleComplete();
        }
      }
      onFatalException(task, e) {
        const gitError = e instanceof GitError ? Object.assign(e, { task }) : new GitError(task, e && String(e));
        this._chain = Promise.resolve();
        this._queue.fatal(gitError);
        return gitError;
      }
      async attemptRemoteTask(task, logger) {
        const binary = this._plugins.exec("spawn.binary", "", pluginContext(task, task.commands));
        const args = this._plugins.exec("spawn.args", [...task.commands], pluginContext(task, task.commands));
        const raw = await this.gitResponse(task, binary, args, this.outputHandler, logger.step("SPAWN"));
        const outputStreams = await this.handleTaskData(task, args, raw, logger.step("HANDLE"));
        logger(`passing response to task's parser as a %s`, task.format);
        if (isBufferTask(task)) {
          return callTaskParser(task.parser, outputStreams);
        }
        return callTaskParser(task.parser, outputStreams.asStrings());
      }
      async attemptEmptyTask(task, logger) {
        logger(`empty task bypassing child process to call to task's parser`);
        return task.parser(this);
      }
      handleTaskData(task, args, result, logger) {
        const { exitCode, rejection, stdOut, stdErr } = result;
        return new Promise((done, fail) => {
          logger(`Preparing to handle process response exitCode=%d stdOut=`, exitCode);
          const { error } = this._plugins.exec("task.error", { error: rejection }, {
            ...pluginContext(task, args),
            ...result
          });
          if (error && task.onError) {
            logger.info(`exitCode=%s handling with custom error handler`);
            return task.onError(result, error, (newStdOut) => {
              logger.info(`custom error handler treated as success`);
              logger(`custom error returned a %s`, objectToString(newStdOut));
              done(new GitOutputStreams(Array.isArray(newStdOut) ? Buffer.concat(newStdOut) : newStdOut, Buffer.concat(stdErr)));
            }, fail);
          }
          if (error) {
            logger.info(`handling as error: exitCode=%s stdErr=%s rejection=%o`, exitCode, stdErr.length, rejection);
            return fail(error);
          }
          logger.info(`retrieving task output complete`);
          done(new GitOutputStreams(Buffer.concat(stdOut), Buffer.concat(stdErr)));
        });
      }
      async gitResponse(task, command, args, outputHandler, logger) {
        const outputLogger = logger.sibling("output");
        const spawnOptions = this._plugins.exec("spawn.options", {
          cwd: this.cwd,
          env: this.env,
          windowsHide: true
        }, pluginContext(task, task.commands));
        return new Promise((done) => {
          const stdOut = [];
          const stdErr = [];
          logger.info(`%s %o`, command, args);
          logger("%O", spawnOptions);
          let rejection = this._beforeSpawn(task, args);
          if (rejection) {
            return done({
              stdOut,
              stdErr,
              exitCode: 9901,
              rejection
            });
          }
          this._plugins.exec("spawn.before", void 0, {
            ...pluginContext(task, args),
            kill(reason) {
              rejection = reason || rejection;
            }
          });
          const spawned = (0, import_child_process.spawn)(command, args, spawnOptions);
          spawned.stdout.on("data", onDataReceived(stdOut, "stdOut", logger, outputLogger.step("stdOut")));
          spawned.stderr.on("data", onDataReceived(stdErr, "stdErr", logger, outputLogger.step("stdErr")));
          spawned.on("error", onErrorReceived(stdErr, logger));
          if (outputHandler) {
            logger(`Passing child process stdOut/stdErr to custom outputHandler`);
            outputHandler(command, spawned.stdout, spawned.stderr, [...args]);
          }
          this._plugins.exec("spawn.after", void 0, {
            ...pluginContext(task, args),
            spawned,
            close(exitCode, reason) {
              done({
                stdOut,
                stdErr,
                exitCode,
                rejection: rejection || reason
              });
            },
            kill(reason) {
              if (spawned.killed) {
                return;
              }
              rejection = reason;
              spawned.kill("SIGINT");
            }
          });
        });
      }
      _beforeSpawn(task, args) {
        let rejection;
        this._plugins.exec("spawn.before", void 0, {
          ...pluginContext(task, args),
          kill(reason) {
            rejection = reason || rejection;
          }
        });
        return rejection;
      }
    };
  }
});
var git_executor_exports = {};
__export2(git_executor_exports, {
  GitExecutor: () => GitExecutor
});
var GitExecutor;
var init_git_executor = __esm2({
  "src/lib/runners/git-executor.ts"() {
    init_git_executor_chain();
    GitExecutor = class {
      constructor(cwd, _scheduler, _plugins) {
        this.cwd = cwd;
        this._scheduler = _scheduler;
        this._plugins = _plugins;
        this._chain = new GitExecutorChain(this, this._scheduler, this._plugins);
      }
      chain() {
        return new GitExecutorChain(this, this._scheduler, this._plugins);
      }
      push(task) {
        return this._chain.push(task);
      }
    };
  }
});
function taskCallback(task, response, callback = NOOP) {
  const onSuccess = (data) => {
    callback(null, data);
  };
  const onError2 = (err) => {
    if (err?.task === task) {
      callback(err instanceof GitResponseError ? addDeprecationNoticeToError(err) : err, void 0);
    }
  };
  response.then(onSuccess, onError2);
}
function addDeprecationNoticeToError(err) {
  let log = (name) => {
    console.warn(`simple-git deprecation notice: accessing GitResponseError.${name} should be GitResponseError.git.${name}, this will no longer be available in version 3`);
    log = NOOP;
  };
  return Object.create(err, Object.getOwnPropertyNames(err.git).reduce(descriptorReducer, {}));
  function descriptorReducer(all, name) {
    if (name in err) {
      return all;
    }
    all[name] = {
      enumerable: false,
      configurable: false,
      get() {
        log(name);
        return err.git[name];
      }
    };
    return all;
  }
}
var init_task_callback = __esm2({
  "src/lib/task-callback.ts"() {
    init_git_response_error();
    init_utils();
  }
});
function changeWorkingDirectoryTask(directory, root) {
  return adhocExecTask((instance) => {
    if (!folderExists(directory)) {
      throw new Error(`Git.cwd: cannot change to non-directory "${directory}"`);
    }
    return (root || instance).cwd = directory;
  });
}
var init_change_working_directory = __esm2({
  "src/lib/tasks/change-working-directory.ts"() {
    init_utils();
    init_task();
  }
});
function checkoutTask(args) {
  const commands4 = ["checkout", ...args];
  if (commands4[1] === "-b" && commands4.includes("-B")) {
    commands4[1] = remove(commands4, "-B");
  }
  return straightThroughStringTask(commands4);
}
function checkout_default() {
  return {
    checkout() {
      return this._runTask(checkoutTask(getTrailingOptions(arguments, 1)), trailingFunctionArgument(arguments));
    },
    checkoutBranch(branchName, startPoint) {
      return this._runTask(checkoutTask(["-b", branchName, startPoint, ...getTrailingOptions(arguments)]), trailingFunctionArgument(arguments));
    },
    checkoutLocalBranch(branchName) {
      return this._runTask(checkoutTask(["-b", branchName, ...getTrailingOptions(arguments)]), trailingFunctionArgument(arguments));
    }
  };
}
var init_checkout = __esm2({
  "src/lib/tasks/checkout.ts"() {
    init_utils();
    init_task();
  }
});
function countObjectsResponse() {
  return {
    count: 0,
    garbage: 0,
    inPack: 0,
    packs: 0,
    prunePackable: 0,
    size: 0,
    sizeGarbage: 0,
    sizePack: 0
  };
}
function count_objects_default() {
  return {
    countObjects() {
      return this._runTask({
        commands: ["count-objects", "--verbose"],
        format: "utf-8",
        parser(stdOut) {
          return parseStringResponse(countObjectsResponse(), [parser2], stdOut);
        }
      });
    }
  };
}
var parser2;
var init_count_objects = __esm2({
  "src/lib/tasks/count-objects.ts"() {
    init_utils();
    parser2 = new LineParser(/([a-z-]+): (\d+)$/, (result, [key, value]) => {
      const property = asCamelCase(key);
      if (Object.hasOwn(result, property)) {
        result[property] = asNumber(value);
      }
    });
  }
});
function parseCommitResult(stdOut) {
  const result = {
    author: null,
    branch: "",
    commit: "",
    root: false,
    summary: {
      changes: 0,
      insertions: 0,
      deletions: 0
    }
  };
  return parseStringResponse(result, parsers, stdOut);
}
var parsers;
var init_parse_commit = __esm2({
  "src/lib/parsers/parse-commit.ts"() {
    init_utils();
    parsers = [
      new LineParser(/^\[([^\s]+)( \([^)]+\))? ([^\]]+)/, (result, [branch, root, commit]) => {
        result.branch = branch;
        result.commit = commit;
        result.root = !!root;
      }),
      new LineParser(/\s*Author:\s(.+)/i, (result, [author]) => {
        const parts = author.split("<");
        const email = parts.pop();
        if (!email || !email.includes("@")) {
          return;
        }
        result.author = {
          email: email.substr(0, email.length - 1),
          name: parts.join("<").trim()
        };
      }),
      new LineParser(/(\d+)[^,]*(?:,\s*(\d+)[^,]*)(?:,\s*(\d+))/g, (result, [changes, insertions, deletions]) => {
        result.summary.changes = parseInt(changes, 10) || 0;
        result.summary.insertions = parseInt(insertions, 10) || 0;
        result.summary.deletions = parseInt(deletions, 10) || 0;
      }),
      new LineParser(/^(\d+)[^,]*(?:,\s*(\d+)[^(]+\(([+-]))?/, (result, [changes, lines, direction]) => {
        result.summary.changes = parseInt(changes, 10) || 0;
        const count = parseInt(lines, 10) || 0;
        if (direction === "-") {
          result.summary.deletions = count;
        } else if (direction === "+") {
          result.summary.insertions = count;
        }
      })
    ];
  }
});
function commitTask(message, files, customArgs) {
  const commands4 = [
    "-c",
    "core.abbrev=40",
    "commit",
    ...prefixedArray(message, "-m"),
    ...files,
    ...customArgs
  ];
  return {
    commands: commands4,
    format: "utf-8",
    parser: parseCommitResult
  };
}
function commit_default() {
  return {
    commit(message, ...rest) {
      const next = trailingFunctionArgument(arguments);
      const task = rejectDeprecatedSignatures(message) || commitTask(asArray(message), asArray(filterType(rest[0], filterStringOrStringArray, [])), [
        ...asStringArray(filterType(rest[1], filterArray, [])),
        ...getTrailingOptions(arguments, 0, true)
      ]);
      return this._runTask(task, next);
    }
  };
  function rejectDeprecatedSignatures(message) {
    return !filterStringOrStringArray(message) && configurationErrorTask(`git.commit: requires the commit message to be supplied as a string/string[]`);
  }
}
var init_commit = __esm2({
  "src/lib/tasks/commit.ts"() {
    init_parse_commit();
    init_utils();
    init_task();
  }
});
function first_commit_default() {
  return {
    firstCommit() {
      return this._runTask(straightThroughStringTask(["rev-list", "--max-parents=0", "HEAD"], true), trailingFunctionArgument(arguments));
    }
  };
}
var init_first_commit = __esm2({
  "src/lib/tasks/first-commit.ts"() {
    init_utils();
    init_task();
  }
});
function hashObjectTask(filePath, write) {
  const commands4 = ["hash-object", filePath];
  if (write) {
    commands4.push("-w");
  }
  return straightThroughStringTask(commands4, true);
}
var init_hash_object = __esm2({
  "src/lib/tasks/hash-object.ts"() {
    init_task();
  }
});
function parseInit(bare, path42, text) {
  const response = String(text).trim();
  let result;
  if (result = initResponseRegex.exec(response)) {
    return new InitSummary(bare, path42, false, result[1]);
  }
  if (result = reInitResponseRegex.exec(response)) {
    return new InitSummary(bare, path42, true, result[1]);
  }
  let gitDir = "";
  const tokens = response.split(" ");
  while (tokens.length) {
    const token = tokens.shift();
    if (token === "in") {
      gitDir = tokens.join(" ");
      break;
    }
  }
  return new InitSummary(bare, path42, /^re/i.test(response), gitDir);
}
var InitSummary;
var initResponseRegex;
var reInitResponseRegex;
var init_InitSummary = __esm2({
  "src/lib/responses/InitSummary.ts"() {
    InitSummary = class {
      constructor(bare, path42, existing, gitDir) {
        this.bare = bare;
        this.path = path42;
        this.existing = existing;
        this.gitDir = gitDir;
      }
    };
    initResponseRegex = /^Init.+ repository in (.+)$/;
    reInitResponseRegex = /^Rein.+ in (.+)$/;
  }
});
function hasBareCommand(command) {
  return command.includes(bareCommand);
}
function initTask(bare = false, path42, customArgs) {
  const commands4 = ["init", ...customArgs];
  if (bare && !hasBareCommand(commands4)) {
    commands4.splice(1, 0, bareCommand);
  }
  return {
    commands: commands4,
    format: "utf-8",
    parser(text) {
      return parseInit(commands4.includes("--bare"), path42, text);
    }
  };
}
var bareCommand;
var init_init = __esm2({
  "src/lib/tasks/init.ts"() {
    init_InitSummary();
    bareCommand = "--bare";
  }
});
function logFormatFromCommand(customArgs) {
  for (let i = 0; i < customArgs.length; i++) {
    const format = logFormatRegex.exec(customArgs[i]);
    if (format) {
      return `--${format[1]}`;
    }
  }
  return "";
}
function isLogFormat(customArg) {
  return logFormatRegex.test(customArg);
}
var logFormatRegex;
var init_log_format = __esm2({
  "src/lib/args/log-format.ts"() {
    logFormatRegex = /^--(stat|numstat|name-only|name-status)(=|$)/;
  }
});
var DiffSummary;
var init_DiffSummary = __esm2({
  "src/lib/responses/DiffSummary.ts"() {
    DiffSummary = class {
      constructor() {
        this.changed = 0;
        this.deletions = 0;
        this.insertions = 0;
        this.files = [];
      }
    };
  }
});
function getDiffParser(format = "") {
  const parser4 = diffSummaryParsers[format];
  return (stdOut) => parseStringResponse(new DiffSummary(), parser4, stdOut, false);
}
var statParser;
var numStatParser;
var nameOnlyParser;
var nameStatusParser;
var diffSummaryParsers;
var init_parse_diff_summary = __esm2({
  "src/lib/parsers/parse-diff-summary.ts"() {
    init_log_format();
    init_DiffSummary();
    init_diff_name_status();
    init_utils();
    statParser = [
      new LineParser(/^(.+)\s+\|\s+(\d+)(\s+[+\-]+)?$/, (result, [file, changes, alterations = ""]) => {
        result.files.push({
          file: file.trim(),
          changes: asNumber(changes),
          insertions: alterations.replace(/[^+]/g, "").length,
          deletions: alterations.replace(/[^-]/g, "").length,
          binary: false
        });
      }),
      new LineParser(/^(.+) \|\s+Bin ([0-9.]+) -> ([0-9.]+) ([a-z]+)/, (result, [file, before, after]) => {
        result.files.push({
          file: file.trim(),
          before: asNumber(before),
          after: asNumber(after),
          binary: true
        });
      }),
      new LineParser(/(\d+) files? changed\s*((?:, \d+ [^,]+){0,2})/, (result, [changed, summary]) => {
        const inserted = /(\d+) i/.exec(summary);
        const deleted = /(\d+) d/.exec(summary);
        result.changed = asNumber(changed);
        result.insertions = asNumber(inserted?.[1]);
        result.deletions = asNumber(deleted?.[1]);
      })
    ];
    numStatParser = [
      new LineParser(/(\d+)\t(\d+)\t(.+)$/, (result, [changesInsert, changesDelete, file]) => {
        const insertions = asNumber(changesInsert);
        const deletions = asNumber(changesDelete);
        result.changed++;
        result.insertions += insertions;
        result.deletions += deletions;
        result.files.push({
          file,
          changes: insertions + deletions,
          insertions,
          deletions,
          binary: false
        });
      }),
      new LineParser(/-\t-\t(.+)$/, (result, [file]) => {
        result.changed++;
        result.files.push({
          file,
          after: 0,
          before: 0,
          binary: true
        });
      })
    ];
    nameOnlyParser = [
      new LineParser(/(.+)$/, (result, [file]) => {
        result.changed++;
        result.files.push({
          file,
          changes: 0,
          insertions: 0,
          deletions: 0,
          binary: false
        });
      })
    ];
    nameStatusParser = [
      new LineParser(/([ACDMRTUXB])([0-9]{0,3})\t(.[^\t]*)(\t(.[^\t]*))?$/, (result, [status, similarity, from, _to, to]) => {
        result.changed++;
        result.files.push({
          file: to ?? from,
          changes: 0,
          insertions: 0,
          deletions: 0,
          binary: false,
          status: orVoid(isDiffNameStatus(status) && status),
          from: orVoid(!!to && from !== to && from),
          similarity: asNumber(similarity)
        });
      })
    ];
    diffSummaryParsers = {
      [""]: statParser,
      ["--stat"]: statParser,
      ["--numstat"]: numStatParser,
      ["--name-status"]: nameStatusParser,
      ["--name-only"]: nameOnlyParser
    };
  }
});
function lineBuilder(tokens, fields) {
  return fields.reduce((line, field, index) => {
    line[field] = tokens[index] || "";
    return line;
  }, /* @__PURE__ */ Object.create({ diff: null }));
}
function createListLogSummaryParser(splitter = SPLITTER, fields = defaultFieldNames, logFormat = "") {
  const parseDiffResult = getDiffParser(logFormat);
  return function(stdOut) {
    const all = toLinesWithContent(stdOut.trim(), false, START_BOUNDARY).map(function(item) {
      const lineDetail = item.split(COMMIT_BOUNDARY);
      const listLogLine = lineBuilder(lineDetail[0].split(splitter), fields);
      if (lineDetail.length > 1 && !!lineDetail[1].trim()) {
        listLogLine.diff = parseDiffResult(lineDetail[1]);
      }
      return listLogLine;
    });
    return {
      all,
      latest: all.length && all[0] || null,
      total: all.length
    };
  };
}
var START_BOUNDARY;
var COMMIT_BOUNDARY;
var SPLITTER;
var defaultFieldNames;
var init_parse_list_log_summary = __esm2({
  "src/lib/parsers/parse-list-log-summary.ts"() {
    init_utils();
    init_parse_diff_summary();
    init_log_format();
    START_BOUNDARY = "\xF2\xF2\xF2\xF2\xF2\xF2 ";
    COMMIT_BOUNDARY = " \xF2\xF2";
    SPLITTER = " \xF2 ";
    defaultFieldNames = ["hash", "date", "message", "refs", "author_name", "author_email"];
  }
});
var diff_exports = {};
__export2(diff_exports, {
  diffSummaryTask: () => diffSummaryTask,
  validateLogFormatConfig: () => validateLogFormatConfig
});
function diffSummaryTask(customArgs) {
  let logFormat = logFormatFromCommand(customArgs);
  const commands4 = ["diff"];
  if (logFormat === "") {
    logFormat = "--stat";
    commands4.push("--stat=4096");
  }
  commands4.push(...customArgs);
  return validateLogFormatConfig(commands4) || {
    commands: commands4,
    format: "utf-8",
    parser: getDiffParser(logFormat)
  };
}
function validateLogFormatConfig(customArgs) {
  const flags = customArgs.filter(isLogFormat);
  if (flags.length > 1) {
    return configurationErrorTask(`Summary flags are mutually exclusive - pick one of ${flags.join(",")}`);
  }
  if (flags.length && customArgs.includes("-z")) {
    return configurationErrorTask(`Summary flag ${flags} parsing is not compatible with null termination option '-z'`);
  }
}
var init_diff = __esm2({
  "src/lib/tasks/diff.ts"() {
    init_log_format();
    init_parse_diff_summary();
    init_task();
  }
});
function prettyFormat(format, splitter) {
  const fields = [];
  const formatStr = [];
  Object.keys(format).forEach((field) => {
    fields.push(field);
    formatStr.push(String(format[field]));
  });
  return [fields, formatStr.join(splitter)];
}
function userOptions(input) {
  return Object.keys(input).reduce((out, key) => {
    if (!(key in excludeOptions)) {
      out[key] = input[key];
    }
    return out;
  }, {});
}
function parseLogOptions(opt = {}, customArgs = []) {
  const splitter = filterType(opt.splitter, filterString, SPLITTER);
  const format = filterPlainObject(opt.format) ? opt.format : {
    hash: "%H",
    date: opt.strictDate === false ? "%ai" : "%aI",
    message: "%s",
    refs: "%D",
    body: opt.multiLine ? "%B" : "%b",
    author_name: opt.mailMap !== false ? "%aN" : "%an",
    author_email: opt.mailMap !== false ? "%aE" : "%ae"
  };
  const [fields, formatStr] = prettyFormat(format, splitter);
  const suffix = [];
  const command = [
    `--pretty=format:${START_BOUNDARY}${formatStr}${COMMIT_BOUNDARY}`,
    ...customArgs
  ];
  const maxCount = opt.n || opt["max-count"] || opt.maxCount;
  if (maxCount) {
    command.push(`--max-count=${maxCount}`);
  }
  if (opt.from || opt.to) {
    const rangeOperator = opt.symmetric !== false ? "..." : "..";
    suffix.push(`${opt.from || ""}${rangeOperator}${opt.to || ""}`);
  }
  if (filterString(opt.file)) {
    command.push("--follow", pathspec(opt.file));
  }
  appendTaskOptions(userOptions(opt), command);
  return {
    fields,
    splitter,
    commands: [...command, ...suffix]
  };
}
function logTask(splitter, fields, customArgs) {
  const parser4 = createListLogSummaryParser(splitter, fields, logFormatFromCommand(customArgs));
  return {
    commands: ["log", ...customArgs],
    format: "utf-8",
    parser: parser4
  };
}
function log_default() {
  return {
    log(...rest) {
      const next = trailingFunctionArgument(arguments);
      const options = parseLogOptions(trailingOptionsArgument(arguments), asStringArray(filterType(arguments[0], filterArray, [])));
      const task = rejectDeprecatedSignatures(...rest) || validateLogFormatConfig(options.commands) || createLogTask(options);
      return this._runTask(task, next);
    }
  };
  function createLogTask(options) {
    return logTask(options.splitter, options.fields, options.commands);
  }
  function rejectDeprecatedSignatures(from, to) {
    return filterString(from) && filterString(to) && configurationErrorTask(`git.log(string, string) should be replaced with git.log({ from: string, to: string })`);
  }
}
var excludeOptions;
var init_log = __esm2({
  "src/lib/tasks/log.ts"() {
    init_log_format();
    init_pathspec();
    init_parse_list_log_summary();
    init_utils();
    init_task();
    init_diff();
    excludeOptions = /* @__PURE__ */ ((excludeOptions2) => {
      excludeOptions2[excludeOptions2["--pretty"] = 0] = "--pretty";
      excludeOptions2[excludeOptions2["max-count"] = 1] = "max-count";
      excludeOptions2[excludeOptions2["maxCount"] = 2] = "maxCount";
      excludeOptions2[excludeOptions2["n"] = 3] = "n";
      excludeOptions2[excludeOptions2["file"] = 4] = "file";
      excludeOptions2[excludeOptions2["format"] = 5] = "format";
      excludeOptions2[excludeOptions2["from"] = 6] = "from";
      excludeOptions2[excludeOptions2["to"] = 7] = "to";
      excludeOptions2[excludeOptions2["splitter"] = 8] = "splitter";
      excludeOptions2[excludeOptions2["symmetric"] = 9] = "symmetric";
      excludeOptions2[excludeOptions2["mailMap"] = 10] = "mailMap";
      excludeOptions2[excludeOptions2["multiLine"] = 11] = "multiLine";
      excludeOptions2[excludeOptions2["strictDate"] = 12] = "strictDate";
      return excludeOptions2;
    })(excludeOptions || {});
  }
});
var MergeSummaryConflict;
var MergeSummaryDetail;
var init_MergeSummary = __esm2({
  "src/lib/responses/MergeSummary.ts"() {
    MergeSummaryConflict = class {
      constructor(reason, file = null, meta) {
        this.reason = reason;
        this.file = file;
        this.meta = meta;
      }
      toString() {
        return `${this.file}:${this.reason}`;
      }
    };
    MergeSummaryDetail = class {
      constructor() {
        this.conflicts = [];
        this.merges = [];
        this.result = "success";
      }
      get failed() {
        return this.conflicts.length > 0;
      }
      get reason() {
        return this.result;
      }
      toString() {
        if (this.conflicts.length) {
          return `CONFLICTS: ${this.conflicts.join(", ")}`;
        }
        return "OK";
      }
    };
  }
});
var PullSummary;
var PullFailedSummary;
var init_PullSummary = __esm2({
  "src/lib/responses/PullSummary.ts"() {
    PullSummary = class {
      constructor() {
        this.remoteMessages = {
          all: []
        };
        this.created = [];
        this.deleted = [];
        this.files = [];
        this.deletions = {};
        this.insertions = {};
        this.summary = {
          changes: 0,
          deletions: 0,
          insertions: 0
        };
      }
    };
    PullFailedSummary = class {
      constructor() {
        this.remote = "";
        this.hash = {
          local: "",
          remote: ""
        };
        this.branch = {
          local: "",
          remote: ""
        };
        this.message = "";
      }
      toString() {
        return this.message;
      }
    };
  }
});
function objectEnumerationResult(remoteMessages) {
  return remoteMessages.objects = remoteMessages.objects || {
    compressing: 0,
    counting: 0,
    enumerating: 0,
    packReused: 0,
    reused: { count: 0, delta: 0 },
    total: { count: 0, delta: 0 }
  };
}
function asObjectCount(source) {
  const count = /^\s*(\d+)/.exec(source);
  const delta = /delta (\d+)/i.exec(source);
  return {
    count: asNumber(count && count[1] || "0"),
    delta: asNumber(delta && delta[1] || "0")
  };
}
var remoteMessagesObjectParsers;
var init_parse_remote_objects = __esm2({
  "src/lib/parsers/parse-remote-objects.ts"() {
    init_utils();
    remoteMessagesObjectParsers = [
      new RemoteLineParser(/^remote:\s*(enumerating|counting|compressing) objects: (\d+),/i, (result, [action, count]) => {
        const key = action.toLowerCase();
        const enumeration = objectEnumerationResult(result.remoteMessages);
        Object.assign(enumeration, { [key]: asNumber(count) });
      }),
      new RemoteLineParser(/^remote:\s*(enumerating|counting|compressing) objects: \d+% \(\d+\/(\d+)\),/i, (result, [action, count]) => {
        const key = action.toLowerCase();
        const enumeration = objectEnumerationResult(result.remoteMessages);
        Object.assign(enumeration, { [key]: asNumber(count) });
      }),
      new RemoteLineParser(/total ([^,]+), reused ([^,]+), pack-reused (\d+)/i, (result, [total, reused, packReused]) => {
        const objects = objectEnumerationResult(result.remoteMessages);
        objects.total = asObjectCount(total);
        objects.reused = asObjectCount(reused);
        objects.packReused = asNumber(packReused);
      })
    ];
  }
});
function parseRemoteMessages(_stdOut, stdErr) {
  return parseStringResponse({ remoteMessages: new RemoteMessageSummary() }, parsers2, stdErr);
}
var parsers2;
var RemoteMessageSummary;
var init_parse_remote_messages = __esm2({
  "src/lib/parsers/parse-remote-messages.ts"() {
    init_utils();
    init_parse_remote_objects();
    parsers2 = [
      new RemoteLineParser(/^remote:\s*(.+)$/, (result, [text]) => {
        result.remoteMessages.all.push(text.trim());
        return false;
      }),
      ...remoteMessagesObjectParsers,
      new RemoteLineParser([/create a (?:pull|merge) request/i, /\s(https?:\/\/\S+)$/], (result, [pullRequestUrl]) => {
        result.remoteMessages.pullRequestUrl = pullRequestUrl;
      }),
      new RemoteLineParser([/found (\d+) vulnerabilities.+\(([^)]+)\)/i, /\s(https?:\/\/\S+)$/], (result, [count, summary, url]) => {
        result.remoteMessages.vulnerabilities = {
          count: asNumber(count),
          summary,
          url
        };
      })
    ];
    RemoteMessageSummary = class {
      constructor() {
        this.all = [];
      }
    };
  }
});
function parsePullErrorResult(stdOut, stdErr) {
  const pullError = parseStringResponse(new PullFailedSummary(), errorParsers, [stdOut, stdErr]);
  return pullError.message && pullError;
}
var FILE_UPDATE_REGEX;
var SUMMARY_REGEX;
var ACTION_REGEX;
var parsers3;
var errorParsers;
var parsePullDetail;
var parsePullResult;
var init_parse_pull = __esm2({
  "src/lib/parsers/parse-pull.ts"() {
    init_PullSummary();
    init_utils();
    init_parse_remote_messages();
    FILE_UPDATE_REGEX = /^\s*(.+?)\s+\|\s+\d+\s*(\+*)(-*)/;
    SUMMARY_REGEX = /(\d+)\D+((\d+)\D+\(\+\))?(\D+(\d+)\D+\(-\))?/;
    ACTION_REGEX = /^(create|delete) mode \d+ (.+)/;
    parsers3 = [
      new LineParser(FILE_UPDATE_REGEX, (result, [file, insertions, deletions]) => {
        result.files.push(file);
        if (insertions) {
          result.insertions[file] = insertions.length;
        }
        if (deletions) {
          result.deletions[file] = deletions.length;
        }
      }),
      new LineParser(SUMMARY_REGEX, (result, [changes, , insertions, , deletions]) => {
        if (insertions !== void 0 || deletions !== void 0) {
          result.summary.changes = +changes || 0;
          result.summary.insertions = +insertions || 0;
          result.summary.deletions = +deletions || 0;
          return true;
        }
        return false;
      }),
      new LineParser(ACTION_REGEX, (result, [action, file]) => {
        append(result.files, file);
        append(action === "create" ? result.created : result.deleted, file);
      })
    ];
    errorParsers = [
      new LineParser(/^from\s(.+)$/i, (result, [remote]) => void (result.remote = remote)),
      new LineParser(/^fatal:\s(.+)$/, (result, [message]) => void (result.message = message)),
      new LineParser(/([a-z0-9]+)\.\.([a-z0-9]+)\s+(\S+)\s+->\s+(\S+)$/, (result, [hashLocal, hashRemote, branchLocal, branchRemote]) => {
        result.branch.local = branchLocal;
        result.hash.local = hashLocal;
        result.branch.remote = branchRemote;
        result.hash.remote = hashRemote;
      })
    ];
    parsePullDetail = (stdOut, stdErr) => {
      return parseStringResponse(new PullSummary(), parsers3, [stdOut, stdErr]);
    };
    parsePullResult = (stdOut, stdErr) => {
      return Object.assign(new PullSummary(), parsePullDetail(stdOut, stdErr), parseRemoteMessages(stdOut, stdErr));
    };
  }
});
var parsers4;
var parseMergeResult;
var parseMergeDetail;
var init_parse_merge = __esm2({
  "src/lib/parsers/parse-merge.ts"() {
    init_MergeSummary();
    init_utils();
    init_parse_pull();
    parsers4 = [
      new LineParser(/^Auto-merging\s+(.+)$/, (summary, [autoMerge]) => {
        summary.merges.push(autoMerge);
      }),
      new LineParser(/^CONFLICT\s+\((.+)\): Merge conflict in (.+)$/, (summary, [reason, file]) => {
        summary.conflicts.push(new MergeSummaryConflict(reason, file));
      }),
      new LineParser(/^CONFLICT\s+\((.+\/delete)\): (.+) deleted in (.+) and/, (summary, [reason, file, deleteRef]) => {
        summary.conflicts.push(new MergeSummaryConflict(reason, file, { deleteRef }));
      }),
      new LineParser(/^CONFLICT\s+\((.+)\):/, (summary, [reason]) => {
        summary.conflicts.push(new MergeSummaryConflict(reason, null));
      }),
      new LineParser(/^Automatic merge failed;\s+(.+)$/, (summary, [result]) => {
        summary.result = result;
      })
    ];
    parseMergeResult = (stdOut, stdErr) => {
      return Object.assign(parseMergeDetail(stdOut, stdErr), parsePullResult(stdOut, stdErr));
    };
    parseMergeDetail = (stdOut) => {
      return parseStringResponse(new MergeSummaryDetail(), parsers4, stdOut);
    };
  }
});
function mergeTask(customArgs) {
  if (!customArgs.length) {
    return configurationErrorTask("Git.merge requires at least one option");
  }
  return {
    commands: ["merge", ...customArgs],
    format: "utf-8",
    parser(stdOut, stdErr) {
      const merge = parseMergeResult(stdOut, stdErr);
      if (merge.failed) {
        throw new GitResponseError(merge);
      }
      return merge;
    }
  };
}
var init_merge = __esm2({
  "src/lib/tasks/merge.ts"() {
    init_git_response_error();
    init_parse_merge();
    init_task();
  }
});
function pushResultPushedItem(local, remote, status) {
  const deleted = status.includes("deleted");
  const tag = status.includes("tag") || /^refs\/tags/.test(local);
  const alreadyUpdated = !status.includes("new");
  return {
    deleted,
    tag,
    branch: !tag,
    new: !alreadyUpdated,
    alreadyUpdated,
    local,
    remote
  };
}
var parsers5;
var parsePushResult;
var parsePushDetail;
var init_parse_push = __esm2({
  "src/lib/parsers/parse-push.ts"() {
    init_utils();
    init_parse_remote_messages();
    parsers5 = [
      new LineParser(/^Pushing to (.+)$/, (result, [repo]) => {
        result.repo = repo;
      }),
      new LineParser(/^updating local tracking ref '(.+)'/, (result, [local]) => {
        result.ref = {
          ...result.ref || {},
          local
        };
      }),
      new LineParser(/^[=*-]\s+([^:]+):(\S+)\s+\[(.+)]$/, (result, [local, remote, type]) => {
        result.pushed.push(pushResultPushedItem(local, remote, type));
      }),
      new LineParser(/^Branch '([^']+)' set up to track remote branch '([^']+)' from '([^']+)'/, (result, [local, remote, remoteName]) => {
        result.branch = {
          ...result.branch || {},
          local,
          remote,
          remoteName
        };
      }),
      new LineParser(/^([^:]+):(\S+)\s+([a-z0-9]+)\.\.([a-z0-9]+)$/, (result, [local, remote, from, to]) => {
        result.update = {
          head: {
            local,
            remote
          },
          hash: {
            from,
            to
          }
        };
      })
    ];
    parsePushResult = (stdOut, stdErr) => {
      const pushDetail = parsePushDetail(stdOut, stdErr);
      const responseDetail = parseRemoteMessages(stdOut, stdErr);
      return {
        ...pushDetail,
        ...responseDetail
      };
    };
    parsePushDetail = (stdOut, stdErr) => {
      return parseStringResponse({ pushed: [] }, parsers5, [stdOut, stdErr]);
    };
  }
});
var push_exports = {};
__export2(push_exports, {
  pushTagsTask: () => pushTagsTask,
  pushTask: () => pushTask
});
function pushTagsTask(ref = {}, customArgs) {
  append(customArgs, "--tags");
  return pushTask(ref, customArgs);
}
function pushTask(ref = {}, customArgs) {
  const commands4 = ["push", ...customArgs];
  if (ref.branch) {
    commands4.splice(1, 0, ref.branch);
  }
  if (ref.remote) {
    commands4.splice(1, 0, ref.remote);
  }
  remove(commands4, "-v");
  append(commands4, "--verbose");
  append(commands4, "--porcelain");
  return {
    commands: commands4,
    format: "utf-8",
    parser: parsePushResult
  };
}
var init_push = __esm2({
  "src/lib/tasks/push.ts"() {
    init_parse_push();
    init_utils();
  }
});
function show_default() {
  return {
    showBuffer() {
      const commands4 = ["show", ...getTrailingOptions(arguments, 1)];
      if (!commands4.includes("--binary")) {
        commands4.splice(1, 0, "--binary");
      }
      return this._runTask(straightThroughBufferTask(commands4), trailingFunctionArgument(arguments));
    },
    show() {
      const commands4 = ["show", ...getTrailingOptions(arguments, 1)];
      return this._runTask(straightThroughStringTask(commands4), trailingFunctionArgument(arguments));
    }
  };
}
var init_show = __esm2({
  "src/lib/tasks/show.ts"() {
    init_utils();
    init_task();
  }
});
var fromPathRegex;
var FileStatusSummary;
var init_FileStatusSummary = __esm2({
  "src/lib/responses/FileStatusSummary.ts"() {
    fromPathRegex = /^(.+)\0(.+)$/;
    FileStatusSummary = class {
      constructor(path42, index, working_dir) {
        this.path = path42;
        this.index = index;
        this.working_dir = working_dir;
        if (index === "R" || working_dir === "R") {
          const detail = fromPathRegex.exec(path42) || [null, path42, path42];
          this.from = detail[2] || "";
          this.path = detail[1] || "";
        }
      }
    };
  }
});
function renamedFile(line) {
  const [to, from] = line.split(NULL);
  return {
    from: from || to,
    to
  };
}
function parser3(indexX, indexY, handler) {
  return [`${indexX}${indexY}`, handler];
}
function conflicts(indexX, ...indexY) {
  return indexY.map((y) => parser3(indexX, y, (result, file) => result.conflicted.push(file)));
}
function splitLine(result, lineStr) {
  const trimmed2 = lineStr.trim();
  switch (" ") {
    case trimmed2.charAt(2):
      return data(trimmed2.charAt(0), trimmed2.charAt(1), trimmed2.slice(3));
    case trimmed2.charAt(1):
      return data(" ", trimmed2.charAt(0), trimmed2.slice(2));
    default:
      return;
  }
  function data(index, workingDir, path42) {
    const raw = `${index}${workingDir}`;
    const handler = parsers6.get(raw);
    if (handler) {
      handler(result, path42);
    }
    if (raw !== "##" && raw !== "!!") {
      result.files.push(new FileStatusSummary(path42, index, workingDir));
    }
  }
}
var StatusSummary;
var parsers6;
var parseStatusSummary;
var init_StatusSummary = __esm2({
  "src/lib/responses/StatusSummary.ts"() {
    init_utils();
    init_FileStatusSummary();
    StatusSummary = class {
      constructor() {
        this.not_added = [];
        this.conflicted = [];
        this.created = [];
        this.deleted = [];
        this.ignored = void 0;
        this.modified = [];
        this.renamed = [];
        this.files = [];
        this.staged = [];
        this.ahead = 0;
        this.behind = 0;
        this.current = null;
        this.tracking = null;
        this.detached = false;
        this.isClean = () => {
          return !this.files.length;
        };
      }
    };
    parsers6 = new Map([
      parser3(" ", "A", (result, file) => result.created.push(file)),
      parser3(" ", "D", (result, file) => result.deleted.push(file)),
      parser3(" ", "M", (result, file) => result.modified.push(file)),
      parser3("A", " ", (result, file) => {
        result.created.push(file);
        result.staged.push(file);
      }),
      parser3("A", "M", (result, file) => {
        result.created.push(file);
        result.staged.push(file);
        result.modified.push(file);
      }),
      parser3("D", " ", (result, file) => {
        result.deleted.push(file);
        result.staged.push(file);
      }),
      parser3("M", " ", (result, file) => {
        result.modified.push(file);
        result.staged.push(file);
      }),
      parser3("M", "M", (result, file) => {
        result.modified.push(file);
        result.staged.push(file);
      }),
      parser3("R", " ", (result, file) => {
        result.renamed.push(renamedFile(file));
      }),
      parser3("R", "M", (result, file) => {
        const renamed = renamedFile(file);
        result.renamed.push(renamed);
        result.modified.push(renamed.to);
      }),
      parser3("!", "!", (_result, _file) => {
        (_result.ignored = _result.ignored || []).push(_file);
      }),
      parser3("?", "?", (result, file) => result.not_added.push(file)),
      ...conflicts("A", "A", "U"),
      ...conflicts("D", "D", "U"),
      ...conflicts("U", "A", "D", "U"),
      [
        "##",
        (result, line) => {
          const aheadReg = /ahead (\d+)/;
          const behindReg = /behind (\d+)/;
          const currentReg = /^(.+?(?=(?:\.{3}|\s|$)))/;
          const trackingReg = /\.{3}(\S*)/;
          const onEmptyBranchReg = /\son\s(\S+?)(?=\.{3}|$)/;
          let regexResult = aheadReg.exec(line);
          result.ahead = regexResult && +regexResult[1] || 0;
          regexResult = behindReg.exec(line);
          result.behind = regexResult && +regexResult[1] || 0;
          regexResult = currentReg.exec(line);
          result.current = filterType(regexResult?.[1], filterString, null);
          regexResult = trackingReg.exec(line);
          result.tracking = filterType(regexResult?.[1], filterString, null);
          regexResult = onEmptyBranchReg.exec(line);
          if (regexResult) {
            result.current = filterType(regexResult?.[1], filterString, result.current);
          }
          result.detached = /\(no branch\)/.test(line);
        }
      ]
    ]);
    parseStatusSummary = function(text) {
      const lines = text.split(NULL);
      const status = new StatusSummary();
      for (let i = 0, l = lines.length; i < l; ) {
        let line = lines[i++].trim();
        if (!line) {
          continue;
        }
        if (line.charAt(0) === "R") {
          line += NULL + (lines[i++] || "");
        }
        splitLine(status, line);
      }
      return status;
    };
  }
});
function statusTask(customArgs) {
  const commands4 = [
    "status",
    "--porcelain",
    "-b",
    "-u",
    "--null",
    ...customArgs.filter((arg) => !ignoredOptions.includes(arg))
  ];
  return {
    format: "utf-8",
    commands: commands4,
    parser(text) {
      return parseStatusSummary(text);
    }
  };
}
var ignoredOptions;
var init_status = __esm2({
  "src/lib/tasks/status.ts"() {
    init_StatusSummary();
    ignoredOptions = ["--null", "-z"];
  }
});
function versionResponse(major = 0, minor = 0, patch = 0, agent = "", installed = true) {
  return Object.defineProperty({
    major,
    minor,
    patch,
    agent,
    installed
  }, "toString", {
    value() {
      return `${this.major}.${this.minor}.${this.patch}`;
    },
    configurable: false,
    enumerable: false
  });
}
function notInstalledResponse() {
  return versionResponse(0, 0, 0, "", false);
}
function version_default() {
  return {
    version() {
      return this._runTask({
        commands: ["--version"],
        format: "utf-8",
        parser: versionParser,
        onError(result, error, done, fail) {
          if (result.exitCode === -2) {
            return done(Buffer.from(NOT_INSTALLED));
          }
          fail(error);
        }
      });
    }
  };
}
function versionParser(stdOut) {
  if (stdOut === NOT_INSTALLED) {
    return notInstalledResponse();
  }
  return parseStringResponse(versionResponse(0, 0, 0, stdOut), parsers7, stdOut);
}
var NOT_INSTALLED;
var parsers7;
var init_version = __esm2({
  "src/lib/tasks/version.ts"() {
    init_utils();
    NOT_INSTALLED = "installed=false";
    parsers7 = [
      new LineParser(/version (\d+)\.(\d+)\.(\d+)(?:\s*\((.+)\))?/, (result, [major, minor, patch, agent = ""]) => {
        Object.assign(result, versionResponse(asNumber(major), asNumber(minor), asNumber(patch), agent));
      }),
      new LineParser(/version (\d+)\.(\d+)\.(\D+)(.+)?$/, (result, [major, minor, patch, agent = ""]) => {
        Object.assign(result, versionResponse(asNumber(major), asNumber(minor), patch, agent));
      })
    ];
  }
});
function createCloneTask(api, task, repoPath, ...args) {
  if (!filterString(repoPath)) {
    return configurationErrorTask(`git.${api}() requires a string 'repoPath'`);
  }
  return task(repoPath, filterType(args[0], filterString), getTrailingOptions(arguments));
}
function clone_default() {
  return {
    clone(repo, ...rest) {
      return this._runTask(createCloneTask("clone", cloneTask, filterType(repo, filterString), ...rest), trailingFunctionArgument(arguments));
    },
    mirror(repo, ...rest) {
      return this._runTask(createCloneTask("mirror", cloneMirrorTask, filterType(repo, filterString), ...rest), trailingFunctionArgument(arguments));
    }
  };
}
var cloneTask;
var cloneMirrorTask;
var init_clone = __esm2({
  "src/lib/tasks/clone.ts"() {
    init_task();
    init_utils();
    init_pathspec();
    cloneTask = (repo, directory, customArgs) => {
      const commands4 = ["clone", ...customArgs];
      filterString(repo) && commands4.push(pathspec(repo));
      filterString(directory) && commands4.push(pathspec(directory));
      return straightThroughStringTask(commands4);
    };
    cloneMirrorTask = (repo, directory, customArgs) => {
      append(customArgs, "--mirror");
      return cloneTask(repo, directory, customArgs);
    };
  }
});
var simple_git_api_exports = {};
__export2(simple_git_api_exports, {
  SimpleGitApi: () => SimpleGitApi
});
var SimpleGitApi;
var init_simple_git_api = __esm2({
  "src/lib/simple-git-api.ts"() {
    init_task_callback();
    init_change_working_directory();
    init_checkout();
    init_count_objects();
    init_commit();
    init_config();
    init_first_commit();
    init_grep();
    init_hash_object();
    init_init();
    init_log();
    init_merge();
    init_push();
    init_show();
    init_status();
    init_task();
    init_version();
    init_utils();
    init_clone();
    SimpleGitApi = class {
      constructor(_executor) {
        this._executor = _executor;
      }
      _runTask(task, then) {
        const chain = this._executor.chain();
        const promise = chain.push(task);
        if (then) {
          taskCallback(task, promise, then);
        }
        return Object.create(this, {
          then: { value: promise.then.bind(promise) },
          catch: { value: promise.catch.bind(promise) },
          _executor: { value: chain }
        });
      }
      add(files) {
        return this._runTask(straightThroughStringTask(["add", ...asArray(files)]), trailingFunctionArgument(arguments));
      }
      cwd(directory) {
        const next = trailingFunctionArgument(arguments);
        if (typeof directory === "string") {
          return this._runTask(changeWorkingDirectoryTask(directory, this._executor), next);
        }
        if (typeof directory?.path === "string") {
          return this._runTask(changeWorkingDirectoryTask(directory.path, directory.root && this._executor || void 0), next);
        }
        return this._runTask(configurationErrorTask("Git.cwd: workingDirectory must be supplied as a string"), next);
      }
      hashObject(path42, write) {
        return this._runTask(hashObjectTask(path42, write === true), trailingFunctionArgument(arguments));
      }
      init(bare) {
        return this._runTask(initTask(bare === true, this._executor.cwd, getTrailingOptions(arguments)), trailingFunctionArgument(arguments));
      }
      merge() {
        return this._runTask(mergeTask(getTrailingOptions(arguments)), trailingFunctionArgument(arguments));
      }
      mergeFromTo(remote, branch) {
        if (!(filterString(remote) && filterString(branch))) {
          return this._runTask(configurationErrorTask(`Git.mergeFromTo requires that the 'remote' and 'branch' arguments are supplied as strings`));
        }
        return this._runTask(mergeTask([remote, branch, ...getTrailingOptions(arguments)]), trailingFunctionArgument(arguments, false));
      }
      outputHandler(handler) {
        this._executor.outputHandler = handler;
        return this;
      }
      push() {
        const task = pushTask({
          remote: filterType(arguments[0], filterString),
          branch: filterType(arguments[1], filterString)
        }, getTrailingOptions(arguments));
        return this._runTask(task, trailingFunctionArgument(arguments));
      }
      stash() {
        return this._runTask(straightThroughStringTask(["stash", ...getTrailingOptions(arguments)]), trailingFunctionArgument(arguments));
      }
      status() {
        return this._runTask(statusTask(getTrailingOptions(arguments)), trailingFunctionArgument(arguments));
      }
    };
    Object.assign(SimpleGitApi.prototype, checkout_default(), clone_default(), commit_default(), config_default(), count_objects_default(), first_commit_default(), grep_default(), log_default(), show_default(), version_default());
  }
});
var scheduler_exports = {};
__export2(scheduler_exports, {
  Scheduler: () => Scheduler
});
var createScheduledTask;
var Scheduler;
var init_scheduler = __esm2({
  "src/lib/runners/scheduler.ts"() {
    init_utils();
    init_git_logger();
    createScheduledTask = /* @__PURE__ */ (() => {
      let id = 0;
      return () => {
        id++;
        const { promise, done } = import_promise_deferred.createDeferred();
        return {
          promise,
          done,
          id
        };
      };
    })();
    Scheduler = class {
      constructor(concurrency = 2) {
        this.concurrency = concurrency;
        this.logger = createLogger("", "scheduler");
        this.pending = [];
        this.running = [];
        this.logger(`Constructed, concurrency=%s`, concurrency);
      }
      schedule() {
        if (!this.pending.length || this.running.length >= this.concurrency) {
          this.logger(`Schedule attempt ignored, pending=%s running=%s concurrency=%s`, this.pending.length, this.running.length, this.concurrency);
          return;
        }
        const task = append(this.running, this.pending.shift());
        this.logger(`Attempting id=%s`, task.id);
        task.done(() => {
          this.logger(`Completing id=`, task.id);
          remove(this.running, task);
          this.schedule();
        });
      }
      next() {
        const { promise, id } = append(this.pending, createScheduledTask());
        this.logger(`Scheduling id=%s`, id);
        this.schedule();
        return promise;
      }
    };
  }
});
var apply_patch_exports = {};
__export2(apply_patch_exports, {
  applyPatchTask: () => applyPatchTask
});
function applyPatchTask(patches, customArgs) {
  return straightThroughStringTask(["apply", ...customArgs, ...patches]);
}
var init_apply_patch = __esm2({
  "src/lib/tasks/apply-patch.ts"() {
    init_task();
  }
});
function branchDeletionSuccess(branch, hash) {
  return {
    branch,
    hash,
    success: true
  };
}
function branchDeletionFailure(branch) {
  return {
    branch,
    hash: null,
    success: false
  };
}
var BranchDeletionBatch;
var init_BranchDeleteSummary = __esm2({
  "src/lib/responses/BranchDeleteSummary.ts"() {
    BranchDeletionBatch = class {
      constructor() {
        this.all = [];
        this.branches = {};
        this.errors = [];
      }
      get success() {
        return !this.errors.length;
      }
    };
  }
});
function hasBranchDeletionError(data, processExitCode) {
  return processExitCode === 1 && deleteErrorRegex.test(data);
}
var deleteSuccessRegex;
var deleteErrorRegex;
var parsers8;
var parseBranchDeletions;
var init_parse_branch_delete = __esm2({
  "src/lib/parsers/parse-branch-delete.ts"() {
    init_BranchDeleteSummary();
    init_utils();
    deleteSuccessRegex = /(\S+)\s+\(\S+\s([^)]+)\)/;
    deleteErrorRegex = /^error[^']+'([^']+)'/m;
    parsers8 = [
      new LineParser(deleteSuccessRegex, (result, [branch, hash]) => {
        const deletion = branchDeletionSuccess(branch, hash);
        result.all.push(deletion);
        result.branches[branch] = deletion;
      }),
      new LineParser(deleteErrorRegex, (result, [branch]) => {
        const deletion = branchDeletionFailure(branch);
        result.errors.push(deletion);
        result.all.push(deletion);
        result.branches[branch] = deletion;
      })
    ];
    parseBranchDeletions = (stdOut, stdErr) => {
      return parseStringResponse(new BranchDeletionBatch(), parsers8, [stdOut, stdErr]);
    };
  }
});
var BranchSummaryResult;
var init_BranchSummary = __esm2({
  "src/lib/responses/BranchSummary.ts"() {
    BranchSummaryResult = class {
      constructor() {
        this.all = [];
        this.branches = {};
        this.current = "";
        this.detached = false;
      }
      push(status, detached, name, commit, label) {
        if (status === "*") {
          this.detached = detached;
          this.current = name;
        }
        this.all.push(name);
        this.branches[name] = {
          current: status === "*",
          linkedWorkTree: status === "+",
          name,
          commit,
          label
        };
      }
    };
  }
});
function branchStatus(input) {
  return input ? input.charAt(0) : "";
}
function parseBranchSummary(stdOut, currentOnly = false) {
  return parseStringResponse(new BranchSummaryResult(), currentOnly ? [currentBranchParser] : parsers9, stdOut);
}
var parsers9;
var currentBranchParser;
var init_parse_branch = __esm2({
  "src/lib/parsers/parse-branch.ts"() {
    init_BranchSummary();
    init_utils();
    parsers9 = [
      new LineParser(/^([*+]\s)?\((?:HEAD )?detached (?:from|at) (\S+)\)\s+([a-z0-9]+)\s(.*)$/, (result, [current, name, commit, label]) => {
        result.push(branchStatus(current), true, name, commit, label);
      }),
      new LineParser(/^([*+]\s)?(\S+)\s+([a-z0-9]+)\s?(.*)$/s, (result, [current, name, commit, label]) => {
        result.push(branchStatus(current), false, name, commit, label);
      })
    ];
    currentBranchParser = new LineParser(/^(\S+)$/s, (result, [name]) => {
      result.push("*", false, name, "", "");
    });
  }
});
var branch_exports = {};
__export2(branch_exports, {
  branchLocalTask: () => branchLocalTask,
  branchTask: () => branchTask,
  containsDeleteBranchCommand: () => containsDeleteBranchCommand,
  deleteBranchTask: () => deleteBranchTask,
  deleteBranchesTask: () => deleteBranchesTask
});
function containsDeleteBranchCommand(commands4) {
  const deleteCommands = ["-d", "-D", "--delete"];
  return commands4.some((command) => deleteCommands.includes(command));
}
function branchTask(customArgs) {
  const isDelete = containsDeleteBranchCommand(customArgs);
  const isCurrentOnly = customArgs.includes("--show-current");
  const commands4 = ["branch", ...customArgs];
  if (commands4.length === 1) {
    commands4.push("-a");
  }
  if (!commands4.includes("-v")) {
    commands4.splice(1, 0, "-v");
  }
  return {
    format: "utf-8",
    commands: commands4,
    parser(stdOut, stdErr) {
      if (isDelete) {
        return parseBranchDeletions(stdOut, stdErr).all[0];
      }
      return parseBranchSummary(stdOut, isCurrentOnly);
    }
  };
}
function branchLocalTask() {
  return {
    format: "utf-8",
    commands: ["branch", "-v"],
    parser(stdOut) {
      return parseBranchSummary(stdOut);
    }
  };
}
function deleteBranchesTask(branches, forceDelete = false) {
  return {
    format: "utf-8",
    commands: ["branch", "-v", forceDelete ? "-D" : "-d", ...branches],
    parser(stdOut, stdErr) {
      return parseBranchDeletions(stdOut, stdErr);
    },
    onError({ exitCode, stdOut }, error, done, fail) {
      if (!hasBranchDeletionError(String(error), exitCode)) {
        return fail(error);
      }
      done(stdOut);
    }
  };
}
function deleteBranchTask(branch, forceDelete = false) {
  const task = {
    format: "utf-8",
    commands: ["branch", "-v", forceDelete ? "-D" : "-d", branch],
    parser(stdOut, stdErr) {
      return parseBranchDeletions(stdOut, stdErr).branches[branch];
    },
    onError({ exitCode, stdErr, stdOut }, error, _, fail) {
      if (!hasBranchDeletionError(String(error), exitCode)) {
        return fail(error);
      }
      throw new GitResponseError(task.parser(bufferToString(stdOut), bufferToString(stdErr)), String(error));
    }
  };
  return task;
}
var init_branch = __esm2({
  "src/lib/tasks/branch.ts"() {
    init_git_response_error();
    init_parse_branch_delete();
    init_parse_branch();
    init_utils();
  }
});
function toPath(input) {
  const path42 = input.trim().replace(/^["']|["']$/g, "");
  return path42 && (0, import_node_path.normalize)(path42);
}
var parseCheckIgnore;
var init_CheckIgnore = __esm2({
  "src/lib/responses/CheckIgnore.ts"() {
    parseCheckIgnore = (text) => {
      return text.split(/\n/g).map(toPath).filter(Boolean);
    };
  }
});
var check_ignore_exports = {};
__export2(check_ignore_exports, {
  checkIgnoreTask: () => checkIgnoreTask
});
function checkIgnoreTask(paths) {
  return {
    commands: ["check-ignore", ...paths],
    format: "utf-8",
    parser: parseCheckIgnore
  };
}
var init_check_ignore = __esm2({
  "src/lib/tasks/check-ignore.ts"() {
    init_CheckIgnore();
  }
});
function parseFetchResult(stdOut, stdErr) {
  const result = {
    raw: stdOut,
    remote: null,
    branches: [],
    tags: [],
    updated: [],
    deleted: []
  };
  return parseStringResponse(result, parsers10, [stdOut, stdErr]);
}
var parsers10;
var init_parse_fetch = __esm2({
  "src/lib/parsers/parse-fetch.ts"() {
    init_utils();
    parsers10 = [
      new LineParser(/From (.+)$/, (result, [remote]) => {
        result.remote = remote;
      }),
      new LineParser(/\* \[new branch]\s+(\S+)\s*-> (.+)$/, (result, [name, tracking]) => {
        result.branches.push({
          name,
          tracking
        });
      }),
      new LineParser(/\* \[new tag]\s+(\S+)\s*-> (.+)$/, (result, [name, tracking]) => {
        result.tags.push({
          name,
          tracking
        });
      }),
      new LineParser(/- \[deleted]\s+\S+\s*-> (.+)$/, (result, [tracking]) => {
        result.deleted.push({
          tracking
        });
      }),
      new LineParser(/\s*([^.]+)\.\.(\S+)\s+(\S+)\s*-> (.+)$/, (result, [from, to, name, tracking]) => {
        result.updated.push({
          name,
          tracking,
          to,
          from
        });
      })
    ];
  }
});
var fetch_exports = {};
__export2(fetch_exports, {
  fetchTask: () => fetchTask
});
function disallowedCommand(command) {
  return /^--upload-pack(=|$)/.test(command);
}
function fetchTask(remote, branch, customArgs) {
  const commands4 = ["fetch", ...customArgs];
  if (remote && branch) {
    commands4.push(remote, branch);
  }
  const banned = commands4.find(disallowedCommand);
  if (banned) {
    return configurationErrorTask(`git.fetch: potential exploit argument blocked.`);
  }
  return {
    commands: commands4,
    format: "utf-8",
    parser: parseFetchResult
  };
}
var init_fetch = __esm2({
  "src/lib/tasks/fetch.ts"() {
    init_parse_fetch();
    init_task();
  }
});
function parseMoveResult(stdOut) {
  return parseStringResponse({ moves: [] }, parsers11, stdOut);
}
var parsers11;
var init_parse_move = __esm2({
  "src/lib/parsers/parse-move.ts"() {
    init_utils();
    parsers11 = [
      new LineParser(/^Renaming (.+) to (.+)$/, (result, [from, to]) => {
        result.moves.push({ from, to });
      })
    ];
  }
});
var move_exports = {};
__export2(move_exports, {
  moveTask: () => moveTask
});
function moveTask(from, to) {
  return {
    commands: ["mv", "-v", ...asArray(from), to],
    format: "utf-8",
    parser: parseMoveResult
  };
}
var init_move = __esm2({
  "src/lib/tasks/move.ts"() {
    init_parse_move();
    init_utils();
  }
});
var pull_exports = {};
__export2(pull_exports, {
  pullTask: () => pullTask
});
function pullTask(remote, branch, customArgs) {
  const commands4 = ["pull", ...customArgs];
  if (remote && branch) {
    commands4.splice(1, 0, remote, branch);
  }
  return {
    commands: commands4,
    format: "utf-8",
    parser(stdOut, stdErr) {
      return parsePullResult(stdOut, stdErr);
    },
    onError(result, _error, _done, fail) {
      const pullError = parsePullErrorResult(bufferToString(result.stdOut), bufferToString(result.stdErr));
      if (pullError) {
        return fail(new GitResponseError(pullError));
      }
      fail(_error);
    }
  };
}
var init_pull = __esm2({
  "src/lib/tasks/pull.ts"() {
    init_git_response_error();
    init_parse_pull();
    init_utils();
  }
});
function parseGetRemotes(text) {
  const remotes = {};
  forEach(text, ([name]) => remotes[name] = { name });
  return Object.values(remotes);
}
function parseGetRemotesVerbose(text) {
  const remotes = {};
  forEach(text, ([name, url, purpose]) => {
    if (!Object.hasOwn(remotes, name)) {
      remotes[name] = {
        name,
        refs: { fetch: "", push: "" }
      };
    }
    if (purpose && url) {
      remotes[name].refs[purpose.replace(/[^a-z]/g, "")] = url;
    }
  });
  return Object.values(remotes);
}
function forEach(text, handler) {
  forEachLineWithContent(text, (line) => handler(line.split(/\s+/)));
}
var init_GetRemoteSummary = __esm2({
  "src/lib/responses/GetRemoteSummary.ts"() {
    init_utils();
  }
});
var remote_exports = {};
__export2(remote_exports, {
  addRemoteTask: () => addRemoteTask,
  getRemotesTask: () => getRemotesTask,
  listRemotesTask: () => listRemotesTask,
  remoteTask: () => remoteTask,
  removeRemoteTask: () => removeRemoteTask
});
function addRemoteTask(remoteName, remoteRepo, customArgs) {
  return straightThroughStringTask(["remote", "add", ...customArgs, remoteName, remoteRepo]);
}
function getRemotesTask(verbose) {
  const commands4 = ["remote"];
  if (verbose) {
    commands4.push("-v");
  }
  return {
    commands: commands4,
    format: "utf-8",
    parser: verbose ? parseGetRemotesVerbose : parseGetRemotes
  };
}
function listRemotesTask(customArgs) {
  const commands4 = [...customArgs];
  if (commands4[0] !== "ls-remote") {
    commands4.unshift("ls-remote");
  }
  return straightThroughStringTask(commands4);
}
function remoteTask(customArgs) {
  const commands4 = [...customArgs];
  if (commands4[0] !== "remote") {
    commands4.unshift("remote");
  }
  return straightThroughStringTask(commands4);
}
function removeRemoteTask(remoteName) {
  return straightThroughStringTask(["remote", "remove", remoteName]);
}
var init_remote = __esm2({
  "src/lib/tasks/remote.ts"() {
    init_GetRemoteSummary();
    init_task();
  }
});
var stash_list_exports = {};
__export2(stash_list_exports, {
  stashListTask: () => stashListTask
});
function stashListTask(opt = {}, customArgs) {
  const options = parseLogOptions(opt);
  const commands4 = ["stash", "list", ...options.commands, ...customArgs];
  const parser4 = createListLogSummaryParser(options.splitter, options.fields, logFormatFromCommand(commands4));
  return validateLogFormatConfig(commands4) || {
    commands: commands4,
    format: "utf-8",
    parser: parser4
  };
}
var init_stash_list = __esm2({
  "src/lib/tasks/stash-list.ts"() {
    init_log_format();
    init_parse_list_log_summary();
    init_diff();
    init_log();
  }
});
var sub_module_exports = {};
__export2(sub_module_exports, {
  addSubModuleTask: () => addSubModuleTask,
  initSubModuleTask: () => initSubModuleTask,
  subModuleTask: () => subModuleTask,
  updateSubModuleTask: () => updateSubModuleTask
});
function addSubModuleTask(repo, path42) {
  return subModuleTask(["add", repo, path42]);
}
function initSubModuleTask(customArgs) {
  return subModuleTask(["init", ...customArgs]);
}
function subModuleTask(customArgs) {
  const commands4 = [...customArgs];
  if (commands4[0] !== "submodule") {
    commands4.unshift("submodule");
  }
  return straightThroughStringTask(commands4);
}
function updateSubModuleTask(customArgs) {
  return subModuleTask(["update", ...customArgs]);
}
var init_sub_module = __esm2({
  "src/lib/tasks/sub-module.ts"() {
    init_task();
  }
});
function singleSorted(a, b) {
  const aIsNum = Number.isNaN(a);
  const bIsNum = Number.isNaN(b);
  if (aIsNum !== bIsNum) {
    return aIsNum ? 1 : -1;
  }
  return aIsNum ? sorted(a, b) : 0;
}
function sorted(a, b) {
  return a === b ? 0 : a > b ? 1 : -1;
}
function trimmed(input) {
  return input.trim();
}
function toNumber(input) {
  if (typeof input === "string") {
    return parseInt(input.replace(/^\D+/g, ""), 10) || 0;
  }
  return 0;
}
var TagList;
var parseTagList;
var init_TagList = __esm2({
  "src/lib/responses/TagList.ts"() {
    TagList = class {
      constructor(all, latest) {
        this.all = all;
        this.latest = latest;
      }
    };
    parseTagList = function(data, customSort = false) {
      const tags = data.split(`
`).map(trimmed).filter(Boolean);
      if (!customSort) {
        tags.sort(function(tagA, tagB) {
          const partsA = tagA.split(".");
          const partsB = tagB.split(".");
          if (partsA.length === 1 || partsB.length === 1) {
            return singleSorted(toNumber(partsA[0]), toNumber(partsB[0]));
          }
          for (let i = 0, l = Math.max(partsA.length, partsB.length); i < l; i++) {
            const diff = sorted(toNumber(partsA[i]), toNumber(partsB[i]));
            if (diff) {
              return diff;
            }
          }
          return 0;
        });
      }
      const latest = customSort ? tags[0] : [...tags].reverse().find((tag) => tag.indexOf(".") >= 0);
      return new TagList(tags, latest);
    };
  }
});
var tag_exports = {};
__export2(tag_exports, {
  addAnnotatedTagTask: () => addAnnotatedTagTask,
  addTagTask: () => addTagTask,
  tagListTask: () => tagListTask
});
function tagListTask(customArgs = []) {
  const hasCustomSort = customArgs.some((option) => /^--sort=/.test(option));
  return {
    format: "utf-8",
    commands: ["tag", "-l", ...customArgs],
    parser(text) {
      return parseTagList(text, hasCustomSort);
    }
  };
}
function addTagTask(name) {
  return {
    format: "utf-8",
    commands: ["tag", name],
    parser() {
      return { name };
    }
  };
}
function addAnnotatedTagTask(name, tagMessage) {
  return {
    format: "utf-8",
    commands: ["tag", "-a", "-m", tagMessage, name],
    parser() {
      return { name };
    }
  };
}
var init_tag = __esm2({
  "src/lib/tasks/tag.ts"() {
    init_TagList();
  }
});
var require_git = __commonJS2({
  "src/git.js"(exports2, module2) {
    var { GitExecutor: GitExecutor2 } = (init_git_executor(), __toCommonJS2(git_executor_exports));
    var { SimpleGitApi: SimpleGitApi2 } = (init_simple_git_api(), __toCommonJS2(simple_git_api_exports));
    var { Scheduler: Scheduler2 } = (init_scheduler(), __toCommonJS2(scheduler_exports));
    var { adhocExecTask: adhocExecTask2, configurationErrorTask: configurationErrorTask2 } = (init_task(), __toCommonJS2(task_exports));
    var {
      asArray: asArray2,
      filterArray: filterArray2,
      filterPrimitives: filterPrimitives2,
      filterString: filterString2,
      filterStringOrStringArray: filterStringOrStringArray2,
      filterType: filterType2,
      getTrailingOptions: getTrailingOptions2,
      trailingFunctionArgument: trailingFunctionArgument2,
      trailingOptionsArgument: trailingOptionsArgument2
    } = (init_utils(), __toCommonJS2(utils_exports));
    var { applyPatchTask: applyPatchTask2 } = (init_apply_patch(), __toCommonJS2(apply_patch_exports));
    var {
      branchTask: branchTask2,
      branchLocalTask: branchLocalTask2,
      deleteBranchesTask: deleteBranchesTask2,
      deleteBranchTask: deleteBranchTask2
    } = (init_branch(), __toCommonJS2(branch_exports));
    var { checkIgnoreTask: checkIgnoreTask2 } = (init_check_ignore(), __toCommonJS2(check_ignore_exports));
    var { checkIsRepoTask: checkIsRepoTask2 } = (init_check_is_repo(), __toCommonJS2(check_is_repo_exports));
    var { cleanWithOptionsTask: cleanWithOptionsTask2, isCleanOptionsArray: isCleanOptionsArray2 } = (init_clean(), __toCommonJS2(clean_exports));
    var { diffSummaryTask: diffSummaryTask2 } = (init_diff(), __toCommonJS2(diff_exports));
    var { fetchTask: fetchTask2 } = (init_fetch(), __toCommonJS2(fetch_exports));
    var { moveTask: moveTask2 } = (init_move(), __toCommonJS2(move_exports));
    var { pullTask: pullTask2 } = (init_pull(), __toCommonJS2(pull_exports));
    var { pushTagsTask: pushTagsTask2 } = (init_push(), __toCommonJS2(push_exports));
    var {
      addRemoteTask: addRemoteTask2,
      getRemotesTask: getRemotesTask2,
      listRemotesTask: listRemotesTask2,
      remoteTask: remoteTask2,
      removeRemoteTask: removeRemoteTask2
    } = (init_remote(), __toCommonJS2(remote_exports));
    var { getResetMode: getResetMode2, resetTask: resetTask2 } = (init_reset(), __toCommonJS2(reset_exports));
    var { stashListTask: stashListTask2 } = (init_stash_list(), __toCommonJS2(stash_list_exports));
    var {
      addSubModuleTask: addSubModuleTask2,
      initSubModuleTask: initSubModuleTask2,
      subModuleTask: subModuleTask2,
      updateSubModuleTask: updateSubModuleTask2
    } = (init_sub_module(), __toCommonJS2(sub_module_exports));
    var { addAnnotatedTagTask: addAnnotatedTagTask2, addTagTask: addTagTask2, tagListTask: tagListTask2 } = (init_tag(), __toCommonJS2(tag_exports));
    var { straightThroughBufferTask: straightThroughBufferTask2, straightThroughStringTask: straightThroughStringTask2 } = (init_task(), __toCommonJS2(task_exports));
    function Git2(options, plugins) {
      this._plugins = plugins;
      this._executor = new GitExecutor2(options.baseDir, new Scheduler2(options.maxConcurrentProcesses), plugins);
      this._trimmed = options.trimmed;
    }
    (Git2.prototype = Object.create(SimpleGitApi2.prototype)).constructor = Git2;
    Git2.prototype.customBinary = function(command) {
      this._plugins.reconfigure("binary", command);
      return this;
    };
    Git2.prototype.env = function(name, value) {
      if (arguments.length === 1 && typeof name === "object") {
        this._executor.env = name;
      } else {
        (this._executor.env = this._executor.env || {})[name] = value;
      }
      return this;
    };
    Git2.prototype.stashList = function(options) {
      return this._runTask(stashListTask2(trailingOptionsArgument2(arguments) || {}, filterArray2(options) && options || []), trailingFunctionArgument2(arguments));
    };
    Git2.prototype.mv = function(from, to) {
      return this._runTask(moveTask2(from, to), trailingFunctionArgument2(arguments));
    };
    Git2.prototype.checkoutLatestTag = function(then) {
      var git = this;
      return this.pull(function() {
        git.tags(function(err, tags) {
          git.checkout(tags.latest, then);
        });
      });
    };
    Git2.prototype.pull = function(remote, branch, options, then) {
      return this._runTask(pullTask2(filterType2(remote, filterString2), filterType2(branch, filterString2), getTrailingOptions2(arguments)), trailingFunctionArgument2(arguments));
    };
    Git2.prototype.fetch = function(remote, branch) {
      return this._runTask(fetchTask2(filterType2(remote, filterString2), filterType2(branch, filterString2), getTrailingOptions2(arguments)), trailingFunctionArgument2(arguments));
    };
    Git2.prototype.silent = function(silence) {
      return this._runTask(adhocExecTask2(() => console.warn("simple-git deprecation notice: git.silent: logging should be configured using the `debug` library / `DEBUG` environment variable, this method will be removed.")));
    };
    Git2.prototype.tags = function(options, then) {
      return this._runTask(tagListTask2(getTrailingOptions2(arguments)), trailingFunctionArgument2(arguments));
    };
    Git2.prototype.rebase = function() {
      return this._runTask(straightThroughStringTask2(["rebase", ...getTrailingOptions2(arguments)]), trailingFunctionArgument2(arguments));
    };
    Git2.prototype.reset = function(mode) {
      return this._runTask(resetTask2(getResetMode2(mode), getTrailingOptions2(arguments)), trailingFunctionArgument2(arguments));
    };
    Git2.prototype.revert = function(commit) {
      const next = trailingFunctionArgument2(arguments);
      if (typeof commit !== "string") {
        return this._runTask(configurationErrorTask2("Commit must be a string"), next);
      }
      return this._runTask(straightThroughStringTask2(["revert", ...getTrailingOptions2(arguments, 0, true), commit]), next);
    };
    Git2.prototype.addTag = function(name) {
      const task = typeof name === "string" ? addTagTask2(name) : configurationErrorTask2("Git.addTag requires a tag name");
      return this._runTask(task, trailingFunctionArgument2(arguments));
    };
    Git2.prototype.addAnnotatedTag = function(tagName, tagMessage) {
      return this._runTask(addAnnotatedTagTask2(tagName, tagMessage), trailingFunctionArgument2(arguments));
    };
    Git2.prototype.deleteLocalBranch = function(branchName, forceDelete, then) {
      return this._runTask(deleteBranchTask2(branchName, typeof forceDelete === "boolean" ? forceDelete : false), trailingFunctionArgument2(arguments));
    };
    Git2.prototype.deleteLocalBranches = function(branchNames, forceDelete, then) {
      return this._runTask(deleteBranchesTask2(branchNames, typeof forceDelete === "boolean" ? forceDelete : false), trailingFunctionArgument2(arguments));
    };
    Git2.prototype.branch = function(options, then) {
      return this._runTask(branchTask2(getTrailingOptions2(arguments)), trailingFunctionArgument2(arguments));
    };
    Git2.prototype.branchLocal = function(then) {
      return this._runTask(branchLocalTask2(), trailingFunctionArgument2(arguments));
    };
    Git2.prototype.raw = function(commands4) {
      const createRestCommands = !Array.isArray(commands4);
      const command = [].slice.call(createRestCommands ? arguments : commands4, 0);
      for (let i = 0; i < command.length && createRestCommands; i++) {
        if (!filterPrimitives2(command[i])) {
          command.splice(i, command.length - i);
          break;
        }
      }
      command.push(...getTrailingOptions2(arguments, 0, true));
      var next = trailingFunctionArgument2(arguments);
      if (!command.length) {
        return this._runTask(configurationErrorTask2("Raw: must supply one or more command to execute"), next);
      }
      return this._runTask(straightThroughStringTask2(command, this._trimmed), next);
    };
    Git2.prototype.submoduleAdd = function(repo, path42, then) {
      return this._runTask(addSubModuleTask2(repo, path42), trailingFunctionArgument2(arguments));
    };
    Git2.prototype.submoduleUpdate = function(args, then) {
      return this._runTask(updateSubModuleTask2(getTrailingOptions2(arguments, true)), trailingFunctionArgument2(arguments));
    };
    Git2.prototype.submoduleInit = function(args, then) {
      return this._runTask(initSubModuleTask2(getTrailingOptions2(arguments, true)), trailingFunctionArgument2(arguments));
    };
    Git2.prototype.subModule = function(options, then) {
      return this._runTask(subModuleTask2(getTrailingOptions2(arguments)), trailingFunctionArgument2(arguments));
    };
    Git2.prototype.listRemote = function() {
      return this._runTask(listRemotesTask2(getTrailingOptions2(arguments)), trailingFunctionArgument2(arguments));
    };
    Git2.prototype.addRemote = function(remoteName, remoteRepo, then) {
      return this._runTask(addRemoteTask2(remoteName, remoteRepo, getTrailingOptions2(arguments)), trailingFunctionArgument2(arguments));
    };
    Git2.prototype.removeRemote = function(remoteName, then) {
      return this._runTask(removeRemoteTask2(remoteName), trailingFunctionArgument2(arguments));
    };
    Git2.prototype.getRemotes = function(verbose, then) {
      return this._runTask(getRemotesTask2(verbose === true), trailingFunctionArgument2(arguments));
    };
    Git2.prototype.remote = function(options, then) {
      return this._runTask(remoteTask2(getTrailingOptions2(arguments)), trailingFunctionArgument2(arguments));
    };
    Git2.prototype.tag = function(options, then) {
      const command = getTrailingOptions2(arguments);
      if (command[0] !== "tag") {
        command.unshift("tag");
      }
      return this._runTask(straightThroughStringTask2(command), trailingFunctionArgument2(arguments));
    };
    Git2.prototype.updateServerInfo = function(then) {
      return this._runTask(straightThroughStringTask2(["update-server-info"]), trailingFunctionArgument2(arguments));
    };
    Git2.prototype.pushTags = function(remote, then) {
      const task = pushTagsTask2({ remote: filterType2(remote, filterString2) }, getTrailingOptions2(arguments));
      return this._runTask(task, trailingFunctionArgument2(arguments));
    };
    Git2.prototype.rm = function(files) {
      return this._runTask(straightThroughStringTask2(["rm", "-f", ...asArray2(files)]), trailingFunctionArgument2(arguments));
    };
    Git2.prototype.rmKeepLocal = function(files) {
      return this._runTask(straightThroughStringTask2(["rm", "--cached", ...asArray2(files)]), trailingFunctionArgument2(arguments));
    };
    Git2.prototype.catFile = function(options, then) {
      return this._catFile("utf-8", arguments);
    };
    Git2.prototype.binaryCatFile = function() {
      return this._catFile("buffer", arguments);
    };
    Git2.prototype._catFile = function(format, args) {
      var handler = trailingFunctionArgument2(args);
      var command = ["cat-file"];
      var options = args[0];
      if (typeof options === "string") {
        return this._runTask(configurationErrorTask2("Git.catFile: options must be supplied as an array of strings"), handler);
      }
      if (Array.isArray(options)) {
        command.push.apply(command, options);
      }
      const task = format === "buffer" ? straightThroughBufferTask2(command) : straightThroughStringTask2(command);
      return this._runTask(task, handler);
    };
    Git2.prototype.diff = function(options, then) {
      const task = filterString2(options) ? configurationErrorTask2("git.diff: supplying options as a single string is no longer supported, switch to an array of strings") : straightThroughStringTask2(["diff", ...getTrailingOptions2(arguments)]);
      return this._runTask(task, trailingFunctionArgument2(arguments));
    };
    Git2.prototype.diffSummary = function() {
      return this._runTask(diffSummaryTask2(getTrailingOptions2(arguments, 1)), trailingFunctionArgument2(arguments));
    };
    Git2.prototype.applyPatch = function(patches) {
      const task = !filterStringOrStringArray2(patches) ? configurationErrorTask2(`git.applyPatch requires one or more string patches as the first argument`) : applyPatchTask2(asArray2(patches), getTrailingOptions2([].slice.call(arguments, 1)));
      return this._runTask(task, trailingFunctionArgument2(arguments));
    };
    Git2.prototype.revparse = function() {
      const commands4 = ["rev-parse", ...getTrailingOptions2(arguments, true)];
      return this._runTask(straightThroughStringTask2(commands4, true), trailingFunctionArgument2(arguments));
    };
    Git2.prototype.clean = function(mode, options, then) {
      const usingCleanOptionsArray = isCleanOptionsArray2(mode);
      const cleanMode = usingCleanOptionsArray && mode.join("") || filterType2(mode, filterString2) || "";
      const customArgs = getTrailingOptions2([].slice.call(arguments, usingCleanOptionsArray ? 1 : 0));
      return this._runTask(cleanWithOptionsTask2(cleanMode, customArgs), trailingFunctionArgument2(arguments));
    };
    Git2.prototype.exec = function(then) {
      const task = {
        commands: [],
        format: "utf-8",
        parser() {
          if (typeof then === "function") {
            then();
          }
        }
      };
      return this._runTask(task);
    };
    Git2.prototype.clearQueue = function() {
      return this._runTask(adhocExecTask2(() => console.warn("simple-git deprecation notice: clearQueue() is deprecated and will be removed, switch to using the abortPlugin instead.")));
    };
    Git2.prototype.checkIgnore = function(pathnames, then) {
      return this._runTask(checkIgnoreTask2(asArray2(filterType2(pathnames, filterStringOrStringArray2, []))), trailingFunctionArgument2(arguments));
    };
    Git2.prototype.checkIsRepo = function(checkType, then) {
      return this._runTask(checkIsRepoTask2(filterType2(checkType, filterString2)), trailingFunctionArgument2(arguments));
    };
    module2.exports = Git2;
  }
});
init_pathspec();
init_git_error();
var GitConstructError = class extends GitError {
  constructor(config, message) {
    super(void 0, message);
    this.config = config;
  }
};
init_git_error();
init_git_error();
var GitPluginError = class extends GitError {
  constructor(task, plugin, message) {
    super(task, message);
    this.task = task;
    this.plugin = plugin;
    Object.setPrototypeOf(this, new.target.prototype);
  }
};
init_git_response_error();
init_task_configuration_error();
init_check_is_repo();
init_clean();
init_config();
init_diff_name_status();
init_grep();
init_reset();
function abortPlugin(signal) {
  if (!signal) {
    return;
  }
  const onSpawnAfter = {
    type: "spawn.after",
    action(_data, context) {
      function kill() {
        context.kill(new GitPluginError(void 0, "abort", "Abort signal received"));
      }
      signal.addEventListener("abort", kill);
      context.spawned.on("close", () => signal.removeEventListener("abort", kill));
    }
  };
  const onSpawnBefore = {
    type: "spawn.before",
    action(_data, context) {
      if (signal.aborted) {
        context.kill(new GitPluginError(void 0, "abort", "Abort already signaled"));
      }
    }
  };
  return [onSpawnBefore, onSpawnAfter];
}
function isConfigSwitch(arg) {
  return typeof arg === "string" && arg.trim().toLowerCase() === "-c";
}
function isCloneUploadPackSwitch(char, arg) {
  if (typeof arg !== "string" || !arg.includes(char)) {
    return false;
  }
  const cleaned = arg.trim().replace(/\0/g, "");
  return /^(--no)?-{1,2}[\dlsqvnobucj]+(\s|$)/.test(cleaned);
}
function preventConfigBuilder(config, setting, message = String(config)) {
  const regex = typeof config === "string" ? new RegExp(`\\s*${config}`, "i") : config;
  return function preventCommand(options, arg, next) {
    if (options[setting] !== true && isConfigSwitch(arg) && regex.test(next)) {
      throw new GitPluginError(void 0, "unsafe", `Configuring ${message} is not permitted without enabling ${setting}`);
    }
  };
}
var preventUnsafeConfig = [
  preventConfigBuilder(/^\s*protocol(.[a-z]+)?.allow/i, "allowUnsafeProtocolOverride", "protocol.allow"),
  preventConfigBuilder("core.sshCommand", "allowUnsafeSshCommand"),
  preventConfigBuilder("core.gitProxy", "allowUnsafeGitProxy"),
  preventConfigBuilder("core.hooksPath", "allowUnsafeHooksPath"),
  preventConfigBuilder("diff.external", "allowUnsafeDiffExternal")
];
function preventUploadPack(arg, method) {
  if (/^\s*--(upload|receive)-pack/.test(arg)) {
    throw new GitPluginError(void 0, "unsafe", `Use of --upload-pack or --receive-pack is not permitted without enabling allowUnsafePack`);
  }
  if (method === "clone" && isCloneUploadPackSwitch("u", arg)) {
    throw new GitPluginError(void 0, "unsafe", `Use of clone with option -u is not permitted without enabling allowUnsafePack`);
  }
  if (method === "push" && /^\s*--exec\b/.test(arg)) {
    throw new GitPluginError(void 0, "unsafe", `Use of push with option --exec is not permitted without enabling allowUnsafePack`);
  }
}
function blockUnsafeOperationsPlugin({
  allowUnsafePack = false,
  ...options
} = {}) {
  return {
    type: "spawn.args",
    action(args, context) {
      args.forEach((current, index) => {
        const next = index < args.length ? args[index + 1] : "";
        allowUnsafePack || preventUploadPack(current, context.method);
        preventUnsafeConfig.forEach((helper) => helper(options, current, next));
      });
      return args;
    }
  };
}
init_utils();
function commandConfigPrefixingPlugin(configuration) {
  const prefix = prefixedArray(configuration, "-c");
  return {
    type: "spawn.args",
    action(data) {
      return [...prefix, ...data];
    }
  };
}
init_utils();
var never = import_promise_deferred2.deferred().promise;
function completionDetectionPlugin({
  onClose = true,
  onExit = 50
} = {}) {
  function createEvents() {
    let exitCode = -1;
    const events = {
      close: import_promise_deferred2.deferred(),
      closeTimeout: import_promise_deferred2.deferred(),
      exit: import_promise_deferred2.deferred(),
      exitTimeout: import_promise_deferred2.deferred()
    };
    const result = Promise.race([
      onClose === false ? never : events.closeTimeout.promise,
      onExit === false ? never : events.exitTimeout.promise
    ]);
    configureTimeout(onClose, events.close, events.closeTimeout);
    configureTimeout(onExit, events.exit, events.exitTimeout);
    return {
      close(code) {
        exitCode = code;
        events.close.done();
      },
      exit(code) {
        exitCode = code;
        events.exit.done();
      },
      get exitCode() {
        return exitCode;
      },
      result
    };
  }
  function configureTimeout(flag, event, timeout) {
    if (flag === false) {
      return;
    }
    (flag === true ? event.promise : event.promise.then(() => delay(flag))).then(timeout.done);
  }
  return {
    type: "spawn.after",
    async action(_data, { spawned, close }) {
      const events = createEvents();
      let deferClose = true;
      let quickClose = () => void (deferClose = false);
      spawned.stdout?.on("data", quickClose);
      spawned.stderr?.on("data", quickClose);
      spawned.on("error", quickClose);
      spawned.on("close", (code) => events.close(code));
      spawned.on("exit", (code) => events.exit(code));
      try {
        await events.result;
        if (deferClose) {
          await delay(50);
        }
        close(events.exitCode);
      } catch (err) {
        close(events.exitCode, err);
      }
    }
  };
}
init_utils();
var WRONG_NUMBER_ERR = `Invalid value supplied for custom binary, requires a single string or an array containing either one or two strings`;
var WRONG_CHARS_ERR = `Invalid value supplied for custom binary, restricted characters must be removed or supply the unsafe.allowUnsafeCustomBinary option`;
function isBadArgument(arg) {
  return !arg || !/^([a-z]:)?([a-z0-9/.\\_~-]+)$/i.test(arg);
}
function toBinaryConfig(input, allowUnsafe) {
  if (input.length < 1 || input.length > 2) {
    throw new GitPluginError(void 0, "binary", WRONG_NUMBER_ERR);
  }
  const isBad = input.some(isBadArgument);
  if (isBad) {
    if (allowUnsafe) {
      console.warn(WRONG_CHARS_ERR);
    } else {
      throw new GitPluginError(void 0, "binary", WRONG_CHARS_ERR);
    }
  }
  const [binary, prefix] = input;
  return {
    binary,
    prefix
  };
}
function customBinaryPlugin(plugins, input = ["git"], allowUnsafe = false) {
  let config = toBinaryConfig(asArray(input), allowUnsafe);
  plugins.on("binary", (input2) => {
    config = toBinaryConfig(asArray(input2), allowUnsafe);
  });
  plugins.append("spawn.binary", () => {
    return config.binary;
  });
  plugins.append("spawn.args", (data) => {
    return config.prefix ? [config.prefix, ...data] : data;
  });
}
init_git_error();
function isTaskError(result) {
  return !!(result.exitCode && result.stdErr.length);
}
function getErrorMessage(result) {
  return Buffer.concat([...result.stdOut, ...result.stdErr]);
}
function errorDetectionHandler(overwrite = false, isError = isTaskError, errorMessage = getErrorMessage) {
  return (error, result) => {
    if (!overwrite && error || !isError(result)) {
      return error;
    }
    return errorMessage(result);
  };
}
function errorDetectionPlugin(config) {
  return {
    type: "task.error",
    action(data, context) {
      const error = config(data.error, {
        stdErr: context.stdErr,
        stdOut: context.stdOut,
        exitCode: context.exitCode
      });
      if (Buffer.isBuffer(error)) {
        return { error: new GitError(void 0, error.toString("utf-8")) };
      }
      return {
        error
      };
    }
  };
}
init_utils();
var PluginStore = class {
  constructor() {
    this.plugins = /* @__PURE__ */ new Set();
    this.events = new import_node_events.EventEmitter();
  }
  on(type, listener) {
    this.events.on(type, listener);
  }
  reconfigure(type, data) {
    this.events.emit(type, data);
  }
  append(type, action) {
    const plugin = append(this.plugins, { type, action });
    return () => this.plugins.delete(plugin);
  }
  add(plugin) {
    const plugins = [];
    asArray(plugin).forEach((plugin2) => plugin2 && this.plugins.add(append(plugins, plugin2)));
    return () => {
      plugins.forEach((plugin2) => this.plugins.delete(plugin2));
    };
  }
  exec(type, data, context) {
    let output = data;
    const contextual = Object.freeze(Object.create(context));
    for (const plugin of this.plugins) {
      if (plugin.type === type) {
        output = plugin.action(output, contextual);
      }
    }
    return output;
  }
};
init_utils();
function progressMonitorPlugin(progress) {
  const progressCommand = "--progress";
  const progressMethods = ["checkout", "clone", "fetch", "pull", "push"];
  const onProgress = {
    type: "spawn.after",
    action(_data, context) {
      if (!context.commands.includes(progressCommand)) {
        return;
      }
      context.spawned.stderr?.on("data", (chunk) => {
        const message = /^([\s\S]+?):\s*(\d+)% \((\d+)\/(\d+)\)/.exec(chunk.toString("utf8"));
        if (!message) {
          return;
        }
        progress({
          method: context.method,
          stage: progressEventStage(message[1]),
          progress: asNumber(message[2]),
          processed: asNumber(message[3]),
          total: asNumber(message[4])
        });
      });
    }
  };
  const onArgs = {
    type: "spawn.args",
    action(args, context) {
      if (!progressMethods.includes(context.method)) {
        return args;
      }
      return including(args, progressCommand);
    }
  };
  return [onArgs, onProgress];
}
function progressEventStage(input) {
  return String(input.toLowerCase().split(" ", 1)) || "unknown";
}
init_utils();
function spawnOptionsPlugin(spawnOptions) {
  const options = pick(spawnOptions, ["uid", "gid"]);
  return {
    type: "spawn.options",
    action(data) {
      return { ...options, ...data };
    }
  };
}
function timeoutPlugin({
  block,
  stdErr = true,
  stdOut = true
}) {
  if (block > 0) {
    return {
      type: "spawn.after",
      action(_data, context) {
        let timeout;
        function wait() {
          timeout && clearTimeout(timeout);
          timeout = setTimeout(kill, block);
        }
        function stop() {
          context.spawned.stdout?.off("data", wait);
          context.spawned.stderr?.off("data", wait);
          context.spawned.off("exit", stop);
          context.spawned.off("close", stop);
          timeout && clearTimeout(timeout);
        }
        function kill() {
          stop();
          context.kill(new GitPluginError(void 0, "timeout", `block timeout reached`));
        }
        stdOut && context.spawned.stdout?.on("data", wait);
        stdErr && context.spawned.stderr?.on("data", wait);
        context.spawned.on("exit", stop);
        context.spawned.on("close", stop);
        wait();
      }
    };
  }
}
init_pathspec();
function suffixPathsPlugin() {
  return {
    type: "spawn.args",
    action(data) {
      const prefix = [];
      let suffix;
      function append2(args) {
        (suffix = suffix || []).push(...args);
      }
      for (let i = 0; i < data.length; i++) {
        const param = data[i];
        if (isPathSpec(param)) {
          append2(toPaths(param));
          continue;
        }
        if (param === "--") {
          append2(data.slice(i + 1).flatMap((item) => isPathSpec(item) && toPaths(item) || item));
          break;
        }
        prefix.push(param);
      }
      return !suffix ? prefix : [...prefix, "--", ...suffix.map(String)];
    }
  };
}
init_utils();
var Git = require_git();
function gitInstanceFactory(baseDir, options) {
  const plugins = new PluginStore();
  const config = createInstanceConfig(baseDir && (typeof baseDir === "string" ? { baseDir } : baseDir) || {}, options);
  if (!folderExists(config.baseDir)) {
    throw new GitConstructError(config, `Cannot use simple-git on a directory that does not exist`);
  }
  if (Array.isArray(config.config)) {
    plugins.add(commandConfigPrefixingPlugin(config.config));
  }
  plugins.add(blockUnsafeOperationsPlugin(config.unsafe));
  plugins.add(completionDetectionPlugin(config.completion));
  config.abort && plugins.add(abortPlugin(config.abort));
  config.progress && plugins.add(progressMonitorPlugin(config.progress));
  config.timeout && plugins.add(timeoutPlugin(config.timeout));
  config.spawnOptions && plugins.add(spawnOptionsPlugin(config.spawnOptions));
  plugins.add(suffixPathsPlugin());
  plugins.add(errorDetectionPlugin(errorDetectionHandler(true)));
  config.errors && plugins.add(errorDetectionPlugin(config.errors));
  customBinaryPlugin(plugins, config.binary, config.unsafe?.allowUnsafeCustomBinary);
  return new Git(config, plugins);
}
init_git_response_error();
var esm_default = gitInstanceFactory;
var WorktreeService = class {
  config;
  constructor(config) {
    this.config = config;
  }
  getGit(cwd) {
    return esm_default(cwd || this.config.baseDir);
  }
  getWorktreesDir() {
    return path4.join(this.config.hiveDir, ".worktrees");
  }
  getWorktreePath(feature, step) {
    return path4.join(this.getWorktreesDir(), feature, step);
  }
  async getStepStatusPath(feature, step) {
    const featureDir = resolveFeatureDirectoryName(this.config.baseDir, feature);
    const featurePath = path4.join(this.config.hiveDir, "features", featureDir);
    const tasksPath = path4.join(featurePath, "tasks", step, "status.json");
    try {
      await fs7.access(tasksPath);
      return tasksPath;
    } catch {
    }
    return path4.join(featurePath, "execution", step, "status.json");
  }
  getBranchName(feature, step) {
    return `hive/${feature}/${step}`;
  }
  async create(feature, step, baseBranch) {
    const worktreePath = this.getWorktreePath(feature, step);
    const branchName = this.getBranchName(feature, step);
    const git = this.getGit();
    await fs7.mkdir(path4.dirname(worktreePath), { recursive: true });
    const base = baseBranch || (await git.revparse(["HEAD"])).trim();
    const existing = await this.get(feature, step);
    if (existing) {
      return existing;
    }
    try {
      await git.raw(["worktree", "add", "-b", branchName, worktreePath, base]);
    } catch {
      try {
        await git.raw(["worktree", "add", worktreePath, branchName]);
      } catch (retryError) {
        throw new Error(`Failed to create worktree: ${retryError}`);
      }
    }
    const worktreeGit = this.getGit(worktreePath);
    const commit = (await worktreeGit.revparse(["HEAD"])).trim();
    return {
      path: worktreePath,
      branch: branchName,
      commit,
      feature,
      step
    };
  }
  async get(feature, step) {
    const worktreePath = this.getWorktreePath(feature, step);
    const branchName = this.getBranchName(feature, step);
    try {
      await fs7.access(worktreePath);
      const worktreeGit = this.getGit(worktreePath);
      const commit = (await worktreeGit.revparse(["HEAD"])).trim();
      return {
        path: worktreePath,
        branch: branchName,
        commit,
        feature,
        step
      };
    } catch {
      return null;
    }
  }
  async getDiff(feature, step, baseCommit) {
    const worktreePath = this.getWorktreePath(feature, step);
    const statusPath = await this.getStepStatusPath(feature, step);
    let base = baseCommit;
    if (!base) {
      try {
        const status = JSON.parse(await fs7.readFile(statusPath, "utf-8"));
        base = status.baseCommit;
      } catch {
      }
    }
    if (!base) {
      base = "HEAD~1";
    }
    const worktreeGit = this.getGit(worktreePath);
    try {
      await worktreeGit.raw(["add", "-A"]);
      const status = await worktreeGit.status();
      const hasStaged = status.staged.length > 0;
      let diffContent = "";
      let stat2 = "";
      if (hasStaged) {
        diffContent = await worktreeGit.diff(["--cached"]);
        stat2 = diffContent ? await worktreeGit.diff(["--cached", "--stat"]) : "";
      } else {
        diffContent = await worktreeGit.diff([`${base}..HEAD`]).catch(() => "");
        stat2 = diffContent ? await worktreeGit.diff([`${base}..HEAD`, "--stat"]) : "";
      }
      const statLines = stat2.split(`
`).filter((l) => l.trim());
      const filesChanged = statLines.slice(0, -1).map((line) => line.split("|")[0].trim()).filter(Boolean);
      const summaryLine = statLines[statLines.length - 1] || "";
      const insertMatch = summaryLine.match(/(\d+) insertion/);
      const deleteMatch = summaryLine.match(/(\d+) deletion/);
      return {
        hasDiff: diffContent.length > 0,
        diffContent,
        filesChanged,
        insertions: insertMatch ? parseInt(insertMatch[1], 10) : 0,
        deletions: deleteMatch ? parseInt(deleteMatch[1], 10) : 0
      };
    } catch {
      return {
        hasDiff: false,
        diffContent: "",
        filesChanged: [],
        insertions: 0,
        deletions: 0
      };
    }
  }
  async exportPatch(feature, step, baseBranch) {
    const worktreePath = this.getWorktreePath(feature, step);
    const patchPath = path4.join(worktreePath, "..", `${step}.patch`);
    const base = baseBranch || "HEAD~1";
    const worktreeGit = this.getGit(worktreePath);
    const diff = await worktreeGit.diff([`${base}...HEAD`]);
    await fs7.writeFile(patchPath, diff);
    return patchPath;
  }
  async applyDiff(feature, step, baseBranch) {
    const { hasDiff, diffContent, filesChanged } = await this.getDiff(feature, step, baseBranch);
    if (!hasDiff) {
      return { success: true, filesAffected: [] };
    }
    const patchPath = path4.join(this.config.hiveDir, ".worktrees", feature, `${step}.patch`);
    try {
      await fs7.writeFile(patchPath, diffContent);
      const git = this.getGit();
      await git.applyPatch(patchPath);
      await fs7.unlink(patchPath).catch(() => {
      });
      return { success: true, filesAffected: filesChanged };
    } catch (error) {
      await fs7.unlink(patchPath).catch(() => {
      });
      const err = error;
      return {
        success: false,
        error: err.message || "Failed to apply patch",
        filesAffected: []
      };
    }
  }
  async revertDiff(feature, step, baseBranch) {
    const { hasDiff, diffContent, filesChanged } = await this.getDiff(feature, step, baseBranch);
    if (!hasDiff) {
      return { success: true, filesAffected: [] };
    }
    const patchPath = path4.join(this.config.hiveDir, ".worktrees", feature, `${step}.patch`);
    try {
      await fs7.writeFile(patchPath, diffContent);
      const git = this.getGit();
      await git.applyPatch(patchPath, ["-R"]);
      await fs7.unlink(patchPath).catch(() => {
      });
      return { success: true, filesAffected: filesChanged };
    } catch (error) {
      await fs7.unlink(patchPath).catch(() => {
      });
      const err = error;
      return {
        success: false,
        error: err.message || "Failed to revert patch",
        filesAffected: []
      };
    }
  }
  parseFilesFromDiff(diffContent) {
    const files = [];
    const regex = /^diff --git a\/(.+?) b\//gm;
    let match;
    while ((match = regex.exec(diffContent)) !== null) {
      files.push(match[1]);
    }
    return [...new Set(files)];
  }
  async revertFromSavedDiff(diffPath) {
    const diffContent = await fs7.readFile(diffPath, "utf-8");
    if (!diffContent.trim()) {
      return { success: true, filesAffected: [] };
    }
    const filesChanged = this.parseFilesFromDiff(diffContent);
    try {
      const git = this.getGit();
      await git.applyPatch(diffContent, ["-R"]);
      return { success: true, filesAffected: filesChanged };
    } catch (error) {
      const err = error;
      return {
        success: false,
        error: err.message || "Failed to revert patch",
        filesAffected: []
      };
    }
  }
  async remove(feature, step, deleteBranch = false) {
    const worktreePath = this.getWorktreePath(feature, step);
    const branchName = this.getBranchName(feature, step);
    const git = this.getGit();
    try {
      await git.raw(["worktree", "remove", worktreePath, "--force"]);
    } catch {
      await fs7.rm(worktreePath, { recursive: true, force: true });
    }
    try {
      await git.raw(["worktree", "prune"]);
    } catch {
    }
    if (deleteBranch) {
      try {
        await git.deleteLocalBranch(branchName, true);
      } catch {
      }
    }
  }
  async list(feature) {
    const worktreesDir = this.getWorktreesDir();
    const results = [];
    try {
      const features = feature ? [feature] : await fs7.readdir(worktreesDir);
      for (const feat of features) {
        const featurePath = path4.join(worktreesDir, feat);
        const stat2 = await fs7.stat(featurePath).catch(() => null);
        if (!stat2?.isDirectory())
          continue;
        const steps = await fs7.readdir(featurePath).catch(() => []);
        for (const step of steps) {
          const info = await this.get(feat, step);
          if (info) {
            results.push(info);
          }
        }
      }
    } catch {
    }
    return results;
  }
  async cleanup(feature) {
    const removed = [];
    const git = this.getGit();
    try {
      await git.raw(["worktree", "prune"]);
    } catch {
    }
    const worktreesDir = this.getWorktreesDir();
    const features = feature ? [feature] : await fs7.readdir(worktreesDir).catch(() => []);
    for (const feat of features) {
      const featurePath = path4.join(worktreesDir, feat);
      const stat2 = await fs7.stat(featurePath).catch(() => null);
      if (!stat2?.isDirectory())
        continue;
      const steps = await fs7.readdir(featurePath).catch(() => []);
      for (const step of steps) {
        const worktreePath = path4.join(featurePath, step);
        const stepStat = await fs7.stat(worktreePath).catch(() => null);
        if (!stepStat?.isDirectory())
          continue;
        try {
          const worktreeGit = this.getGit(worktreePath);
          await worktreeGit.revparse(["HEAD"]);
        } catch {
          await this.remove(feat, step, false);
          removed.push(worktreePath);
        }
      }
    }
    return { removed, pruned: true };
  }
  async checkConflicts(feature, step, baseBranch) {
    const { hasDiff, diffContent } = await this.getDiff(feature, step, baseBranch);
    if (!hasDiff) {
      return [];
    }
    const patchPath = path4.join(this.config.hiveDir, ".worktrees", feature, `${step}-check.patch`);
    try {
      await fs7.writeFile(patchPath, diffContent);
      const git = this.getGit();
      await git.applyPatch(patchPath, ["--check"]);
      await fs7.unlink(patchPath).catch(() => {
      });
      return [];
    } catch (error) {
      await fs7.unlink(patchPath).catch(() => {
      });
      const err = error;
      const stderr = err.message || "";
      const conflicts2 = stderr.split(`
`).filter((line) => line.includes("error: patch failed:")).map((line) => {
        const match = line.match(/error: patch failed: (.+):/);
        return match ? match[1] : null;
      }).filter((f) => f !== null);
      return conflicts2;
    }
  }
  async checkConflictsFromSavedDiff(diffPath, reverse = false) {
    try {
      await fs7.access(diffPath);
    } catch {
      return [];
    }
    try {
      const git = this.getGit();
      const options = reverse ? ["--check", "-R"] : ["--check"];
      await git.applyPatch(diffPath, options);
      return [];
    } catch (error) {
      const err = error;
      const stderr = err.message || "";
      const conflicts2 = stderr.split(`
`).filter((line) => line.includes("error: patch failed:")).map((line) => {
        const match = line.match(/error: patch failed: (.+):/);
        return match ? match[1] : null;
      }).filter((f) => f !== null);
      return conflicts2;
    }
  }
  async commitChanges(feature, step, message) {
    const worktreePath = this.getWorktreePath(feature, step);
    try {
      await fs7.access(worktreePath);
    } catch {
      return { committed: false, sha: "", message: "Worktree not found" };
    }
    const worktreeGit = this.getGit(worktreePath);
    try {
      await worktreeGit.add("-A");
      const status = await worktreeGit.status();
      const hasChanges = status.staged.length > 0 || status.modified.length > 0 || status.not_added.length > 0;
      if (!hasChanges) {
        const currentSha = (await worktreeGit.revparse(["HEAD"])).trim();
        return { committed: false, sha: currentSha, message: "No changes to commit" };
      }
      const commitMessage = message || `hive(${step}): task changes`;
      const result = await worktreeGit.commit(commitMessage, ["--allow-empty-message"]);
      return {
        committed: true,
        sha: result.commit,
        message: commitMessage
      };
    } catch (error) {
      const err = error;
      const currentSha = (await worktreeGit.revparse(["HEAD"]).catch(() => "")).trim();
      return {
        committed: false,
        sha: currentSha,
        message: err.message || "Commit failed"
      };
    }
  }
  async merge(feature, step, strategy = "merge", message) {
    const branchName = this.getBranchName(feature, step);
    const git = this.getGit();
    if (strategy === "rebase" && message) {
      return {
        success: false,
        merged: false,
        error: "Custom merge message is not supported for rebase strategy"
      };
    }
    try {
      const branches = await git.branch();
      if (!branches.all.includes(branchName)) {
        return { success: false, merged: false, error: `Branch ${branchName} not found` };
      }
      const currentBranch = branches.current;
      const diffStat = await git.diff([`${currentBranch}...${branchName}`, "--stat"]);
      const filesChanged = diffStat.split(`
`).filter((l) => l.trim() && l.includes("|")).map((l) => l.split("|")[0].trim());
      if (strategy === "squash") {
        await git.raw(["merge", "--squash", branchName]);
        const squashMessage = message || `hive: merge ${step} (squashed)`;
        const result = await git.commit(squashMessage);
        return {
          success: true,
          merged: true,
          sha: result.commit,
          filesChanged
        };
      } else if (strategy === "rebase") {
        const commits = await git.log([`${currentBranch}..${branchName}`]);
        const commitsToApply = [...commits.all].reverse();
        for (const commit of commitsToApply) {
          await git.raw(["cherry-pick", commit.hash]);
        }
        const head = (await git.revparse(["HEAD"])).trim();
        return {
          success: true,
          merged: true,
          sha: head,
          filesChanged
        };
      } else {
        const mergeMessage = message || `hive: merge ${step}`;
        const result = await git.merge([branchName, "--no-ff", "-m", mergeMessage]);
        const head = (await git.revparse(["HEAD"])).trim();
        return {
          success: true,
          merged: !result.failed,
          sha: head,
          filesChanged,
          conflicts: result.conflicts?.map((c) => c.file || String(c)) || []
        };
      }
    } catch (error) {
      const err = error;
      if (err.message?.includes("CONFLICT") || err.message?.includes("conflict")) {
        await git.raw(["merge", "--abort"]).catch(() => {
        });
        await git.raw(["rebase", "--abort"]).catch(() => {
        });
        await git.raw(["cherry-pick", "--abort"]).catch(() => {
        });
        return {
          success: false,
          merged: false,
          error: "Merge conflicts detected",
          conflicts: this.parseConflictsFromError(err.message || "")
        };
      }
      return {
        success: false,
        merged: false,
        error: err.message || "Merge failed"
      };
    }
  }
  async hasUncommittedChanges(feature, step) {
    const worktreePath = this.getWorktreePath(feature, step);
    try {
      const worktreeGit = this.getGit(worktreePath);
      const status = await worktreeGit.status();
      return status.modified.length > 0 || status.not_added.length > 0 || status.staged.length > 0 || status.deleted.length > 0 || status.created.length > 0;
    } catch {
      return false;
    }
  }
  parseConflictsFromError(errorMessage) {
    const conflicts2 = [];
    const lines = errorMessage.split(`
`);
    for (const line of lines) {
      if (line.includes("CONFLICT") && line.includes("Merge conflict in")) {
        const match = line.match(/Merge conflict in (.+)/);
        if (match)
          conflicts2.push(match[1]);
      }
    }
    return conflicts2;
  }
};
var RESERVED_OVERVIEW_CONTEXT = "overview";
var ContextService = class {
  projectRoot;
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
  }
  write(featureName, fileName, content) {
    const contextPath = getContextPath(this.projectRoot, featureName);
    ensureDir(contextPath);
    const filePath = path5.join(contextPath, this.normalizeFileName(fileName));
    writeText(filePath, content);
    const totalChars = this.list(featureName).reduce((sum, c) => sum + c.content.length, 0);
    if (totalChars > 2e4) {
      return `${filePath}

\u26A0\uFE0F Context total: ${totalChars} chars (exceeds 20,000). Consider archiving older contexts with contextService.archive().`;
    }
    return filePath;
  }
  read(featureName, fileName) {
    const contextPath = getContextPath(this.projectRoot, featureName);
    const filePath = path5.join(contextPath, this.normalizeFileName(fileName));
    return readText(filePath);
  }
  list(featureName) {
    const contextPath = getContextPath(this.projectRoot, featureName);
    if (!fileExists(contextPath))
      return [];
    const files = fs8.readdirSync(contextPath, { withFileTypes: true }).filter((f) => f.isFile() && f.name.endsWith(".md")).map((f) => f.name);
    return files.map((name) => {
      const filePath = path5.join(contextPath, name);
      const stat2 = fs8.statSync(filePath);
      const content = readText(filePath) || "";
      return {
        name: name.replace(/\.md$/, ""),
        content,
        updatedAt: stat2.mtime.toISOString()
      };
    });
  }
  getOverview(featureName) {
    return this.list(featureName).find((file) => file.name === RESERVED_OVERVIEW_CONTEXT) ?? null;
  }
  listExecutionContext(featureName) {
    return this.list(featureName).filter((file) => file.name !== RESERVED_OVERVIEW_CONTEXT);
  }
  delete(featureName, fileName) {
    const contextPath = getContextPath(this.projectRoot, featureName);
    const filePath = path5.join(contextPath, this.normalizeFileName(fileName));
    if (fileExists(filePath)) {
      fs8.unlinkSync(filePath);
      return true;
    }
    return false;
  }
  compile(featureName) {
    const files = this.list(featureName);
    if (files.length === 0)
      return "";
    const sections = files.map((f) => `## ${f.name}

${f.content}`);
    return sections.join(`

---

`);
  }
  archive(featureName) {
    const contexts = this.list(featureName);
    if (contexts.length === 0)
      return { archived: [], archivePath: "" };
    const contextPath = getContextPath(this.projectRoot, featureName);
    const archiveDir = path5.join(contextPath, "..", "archive");
    ensureDir(archiveDir);
    const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
    const archived = [];
    for (const ctx of contexts) {
      const archiveName = `${timestamp}_${ctx.name}.md`;
      const src = path5.join(contextPath, `${ctx.name}.md`);
      const dest = path5.join(archiveDir, archiveName);
      fs8.copyFileSync(src, dest);
      fs8.unlinkSync(src);
      archived.push(ctx.name);
    }
    return { archived, archivePath: archiveDir };
  }
  stats(featureName) {
    const contexts = this.list(featureName);
    if (contexts.length === 0)
      return { count: 0, totalChars: 0 };
    const sorted2 = [...contexts].sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
    return {
      count: contexts.length,
      totalChars: contexts.reduce((sum, c) => sum + c.content.length, 0),
      oldest: sorted2[0].name,
      newest: sorted2[sorted2.length - 1].name
    };
  }
  normalizeFileName(name) {
    const normalized = name.replace(/\.md$/, "");
    return `${normalized}.md`;
  }
};
var AgentsMdService = class {
  rootDir;
  contextService;
  constructor(rootDir, contextService) {
    this.rootDir = rootDir;
    this.contextService = contextService;
  }
  async init() {
    const agentsMdPath = path8.join(this.rootDir, "AGENTS.md");
    const existed = fileExists(agentsMdPath);
    if (existed) {
      const existing = readText(agentsMdPath);
      return { content: existing || "", existed: true };
    }
    const content = await this.scanAndGenerate();
    return { content, existed: false };
  }
  async sync(featureName) {
    const contexts = this.contextService.list(featureName);
    const agentsMdPath = path8.join(this.rootDir, "AGENTS.md");
    const current = await fs11.promises.readFile(agentsMdPath, "utf-8").catch(() => "");
    const findings = this.extractFindings(contexts);
    const proposals = this.generateProposals(findings, current);
    return { proposals, diff: this.formatDiff(current, proposals) };
  }
  apply(content) {
    const agentsMdPath = path8.join(this.rootDir, "AGENTS.md");
    const isNew = !fileExists(agentsMdPath);
    writeText(agentsMdPath, content);
    return { path: agentsMdPath, chars: content.length, isNew };
  }
  extractFindings(contexts) {
    const findings = [];
    const patterns = [
      /we\s+use\s+[^.\n]+/gi,
      /prefer\s+[^.\n]+\s+over\s+[^.\n]+/gi,
      /don't\s+use\s+[^.\n]+/gi,
      /do\s+not\s+use\s+[^.\n]+/gi,
      /(?:build|test|dev)\s+command:\s*[^.\n]+/gi,
      /[a-zA-Z]+\s+lives?\s+in\s+\/[^\s.\n]+/gi
    ];
    for (const context of contexts) {
      const lines = context.content.split(`
`);
      for (const line of lines) {
        const trimmed2 = line.trim();
        if (!trimmed2 || trimmed2.startsWith("#"))
          continue;
        for (const pattern of patterns) {
          const matches = trimmed2.match(pattern);
          if (matches) {
            for (const match of matches) {
              const finding = match.trim();
              if (finding && !findings.includes(finding)) {
                findings.push(finding);
              }
            }
          }
        }
      }
    }
    return findings;
  }
  generateProposals(findings, current) {
    const proposals = [];
    const currentLower = current.toLowerCase();
    for (const finding of findings) {
      const findingLower = finding.toLowerCase();
      if (!currentLower.includes(findingLower)) {
        proposals.push(finding);
      }
    }
    return proposals;
  }
  formatDiff(current, proposals) {
    if (proposals.length === 0)
      return "";
    const lines = proposals.map((p) => `+ ${p}`);
    return lines.join(`
`);
  }
  async scanAndGenerate() {
    const detections = await this.detectProjectInfo();
    return this.generateTemplate(detections);
  }
  async detectProjectInfo() {
    const packageJsonPath = path8.join(this.rootDir, "package.json");
    let packageJson = null;
    if (fileExists(packageJsonPath)) {
      try {
        const content = readText(packageJsonPath);
        packageJson = content ? JSON.parse(content) : null;
      } catch {
      }
    }
    const info = {
      packageManager: this.detectPackageManager(),
      language: this.detectLanguage(),
      testFramework: this.detectTestFramework(packageJson),
      buildCommand: packageJson?.scripts?.build || null,
      testCommand: packageJson?.scripts?.test || null,
      devCommand: packageJson?.scripts?.dev || null,
      isMonorepo: this.detectMonorepo(packageJson)
    };
    return info;
  }
  detectPackageManager() {
    if (fileExists(path8.join(this.rootDir, "bun.lockb")))
      return "bun";
    if (fileExists(path8.join(this.rootDir, "pnpm-lock.yaml")))
      return "pnpm";
    if (fileExists(path8.join(this.rootDir, "yarn.lock")))
      return "yarn";
    if (fileExists(path8.join(this.rootDir, "package-lock.json")))
      return "npm";
    return "npm";
  }
  detectLanguage() {
    if (fileExists(path8.join(this.rootDir, "tsconfig.json")))
      return "TypeScript";
    if (fileExists(path8.join(this.rootDir, "package.json")))
      return "JavaScript";
    if (fileExists(path8.join(this.rootDir, "requirements.txt")))
      return "Python";
    if (fileExists(path8.join(this.rootDir, "go.mod")))
      return "Go";
    if (fileExists(path8.join(this.rootDir, "Cargo.toml")))
      return "Rust";
    return "Unknown";
  }
  detectTestFramework(packageJson) {
    if (!packageJson)
      return null;
    const deps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };
    if (deps?.vitest)
      return "vitest";
    if (deps?.jest)
      return "jest";
    if (this.detectPackageManager() === "bun")
      return "bun test";
    if (deps?.pytest)
      return "pytest";
    return null;
  }
  detectMonorepo(packageJson) {
    if (!packageJson)
      return false;
    return !!packageJson.workspaces;
  }
  generateTemplate(info) {
    const sections = [];
    sections.push(`# Agent Guidelines
`);
    sections.push(`## Overview
`);
    sections.push(`This project uses AI-assisted development. Follow these guidelines.
`);
    sections.push(`## Build & Test Commands
`);
    sections.push("```bash");
    if (info.isMonorepo) {
      sections.push("# This is a monorepo using bun workspaces");
    }
    if (info.buildCommand) {
      sections.push(`# Build`);
      sections.push(`${info.packageManager} run build`);
      sections.push("");
    }
    if (info.testCommand) {
      sections.push(`# Run tests`);
      sections.push(`${info.packageManager} ${info.testCommand === "bun test" ? "test" : "run test"}`);
      sections.push("");
    }
    if (info.devCommand) {
      sections.push(`# Development mode`);
      sections.push(`${info.packageManager} run dev`);
    }
    sections.push("```\n");
    sections.push(`## Technology Stack
`);
    sections.push(`- **Language**: ${info.language}`);
    sections.push(`- **Package Manager**: ${info.packageManager}`);
    if (info.testFramework) {
      sections.push(`- **Test Framework**: ${info.testFramework}`);
    }
    if (info.isMonorepo) {
      sections.push(`- **Structure**: Monorepo with workspaces`);
    }
    sections.push("");
    sections.push(`## Code Style
`);
    sections.push(`Follow existing patterns in the codebase.
`);
    sections.push(`## Architecture Principles
`);
    sections.push(`Document key architectural decisions here.
`);
    return sections.join(`
`);
  }
};
function computeRunnableAndBlocked(tasks) {
  const statusByFolder = /* @__PURE__ */ new Map();
  for (const task of tasks) {
    statusByFolder.set(task.folder, task.status);
  }
  const runnable = [];
  const blocked = {};
  const effectiveDepsByFolder = buildEffectiveDependencies(tasks);
  for (const task of tasks) {
    if (task.status !== "pending") {
      continue;
    }
    const deps = effectiveDepsByFolder.get(task.folder) ?? [];
    const unmetDeps = deps.filter((dep) => {
      const depStatus = statusByFolder.get(dep);
      return depStatus !== "done";
    });
    if (unmetDeps.length === 0) {
      runnable.push(task.folder);
    } else {
      blocked[task.folder] = unmetDeps;
    }
  }
  return { runnable, blocked };
}
function buildEffectiveDependencies(tasks) {
  const orderByFolder = /* @__PURE__ */ new Map();
  const folderByOrder = /* @__PURE__ */ new Map();
  for (const task of tasks) {
    const match = task.folder.match(/^(\d+)-/);
    if (!match) {
      orderByFolder.set(task.folder, null);
      continue;
    }
    const order = parseInt(match[1], 10);
    orderByFolder.set(task.folder, order);
    if (!folderByOrder.has(order)) {
      folderByOrder.set(order, task.folder);
    }
  }
  const effectiveDeps = /* @__PURE__ */ new Map();
  for (const task of tasks) {
    if (task.dependsOn !== void 0) {
      effectiveDeps.set(task.folder, task.dependsOn);
      continue;
    }
    const order = orderByFolder.get(task.folder);
    if (!order || order <= 1) {
      effectiveDeps.set(task.folder, []);
      continue;
    }
    const previousFolder = folderByOrder.get(order - 1);
    effectiveDeps.set(task.folder, previousFolder ? [previousFolder] : []);
  }
  return effectiveDeps;
}

// src/services/watcher.ts
var vscode = __toESM(require("vscode"));
var HiveWatcher = class {
  hiveWatcher;
  githubWatcher;
  pluginWatcher;
  constructor(workspaceRoot, onChange) {
    this.hiveWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(workspaceRoot, ".hive/**/*")
    );
    this.githubWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(workspaceRoot, ".github/**/*")
    );
    this.pluginWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(workspaceRoot, "plugin.json")
    );
    for (const watcher of [this.hiveWatcher, this.githubWatcher, this.pluginWatcher]) {
      watcher.onDidCreate(onChange);
      watcher.onDidChange(onChange);
      watcher.onDidDelete(onChange);
    }
  }
  dispose() {
    this.hiveWatcher.dispose();
    this.githubWatcher.dispose();
    this.pluginWatcher.dispose();
  }
};

// src/services/launcher.ts
var vscode2 = __toESM(require("vscode"));
var fs2 = __toESM(require("fs"));
var path2 = __toESM(require("path"));
var Launcher = class {
  constructor(workspaceRoot) {
    this.workspaceRoot = workspaceRoot;
  }
  /**
   * Open a feature's overview in VS Code and show instructions
   */
  async openFeature(feature) {
    if (!feature || !this.workspaceRoot) {
      vscode2.window.showWarningMessage("Hive: Invalid feature name or workspace root");
      return;
    }
    const activeFeaturePath = path2.join(this.workspaceRoot, ".hive", "active-feature");
    fs2.mkdirSync(path2.dirname(activeFeaturePath), { recursive: true });
    fs2.writeFileSync(activeFeaturePath, feature, "utf-8");
    const featurePath = getFeaturePath(this.workspaceRoot, feature);
    const overviewPath = `${featurePath}/context/overview.md`;
    const planPath = `${featurePath}/plan.md`;
    const targetPath = fs2.existsSync(overviewPath) ? overviewPath : planPath;
    try {
      const uri = vscode2.Uri.file(targetPath);
      await vscode2.workspace.openTextDocument(uri);
      await vscode2.window.showTextDocument(uri);
      vscode2.window.showInformationMessage(
        `Hive: Opened ${feature} ${fs2.existsSync(overviewPath) ? "overview" : "plan"}. Use @Hive in Copilot Chat to continue.`
      );
    } catch (error) {
      vscode2.window.showWarningMessage(`Hive: No overview or plan found for feature "${feature}" - ${error}`);
    }
  }
  /**
   * Open a task's worktree folder in a new VS Code window
   */
  async openTask(feature, task) {
    if (!feature || !task || !this.workspaceRoot) {
      vscode2.window.showWarningMessage("Hive: Invalid feature name, task name, or workspace root");
      return;
    }
    const worktreePath = path2.join(this.workspaceRoot, ".hive", ".worktrees", feature, task);
    const uri = vscode2.Uri.file(worktreePath);
    try {
      await vscode2.commands.executeCommand("vscode.openFolder", uri, { forceNewWindow: true });
    } catch (error) {
      vscode2.window.showErrorMessage(`Hive: Worktree not found for ${feature}/${task} - ${error}`);
    }
  }
  /**
   * Open a file in VS Code
   */
  async openFile(filePath) {
    if (!filePath || !this.workspaceRoot) {
      vscode2.window.showWarningMessage("Hive: Invalid file path or workspace root");
      return;
    }
    try {
      const uri = vscode2.Uri.file(filePath);
      await vscode2.workspace.openTextDocument(uri);
      await vscode2.window.showTextDocument(uri);
    } catch (error) {
      vscode2.window.showErrorMessage(`Hive: Could not open file "${filePath}" - ${error}`);
    }
  }
};

// src/providers/sidebarProvider.ts
var vscode3 = __toESM(require("vscode"));
var fs6 = __toESM(require("fs"));
var path6 = __toESM(require("path"));
var ActionItem = class extends vscode3.TreeItem {
  constructor(label, commandId, iconName) {
    super(label, vscode3.TreeItemCollapsibleState.None);
    this.label = label;
    this.commandId = commandId;
    this.contextValue = "action";
    this.iconPath = new vscode3.ThemeIcon(iconName);
    this.command = {
      command: commandId,
      title: label
    };
  }
};
var STATUS_ICONS = {
  pending: "circle-outline",
  in_progress: "sync~spin",
  done: "pass",
  cancelled: "circle-slash",
  planning: "edit",
  approved: "check",
  executing: "run-all",
  completed: "pass-filled"
};
var StatusGroupItem = class extends vscode3.TreeItem {
  constructor(groupName, groupStatus, features, collapsed = false) {
    super(groupName, collapsed ? vscode3.TreeItemCollapsibleState.Collapsed : vscode3.TreeItemCollapsibleState.Expanded);
    this.groupName = groupName;
    this.groupStatus = groupStatus;
    this.features = features;
    this.description = `${features.length}`;
    this.contextValue = `status-group-${groupStatus}`;
    const icons = {
      in_progress: "sync~spin",
      pending: "circle-outline",
      completed: "pass-filled"
    };
    this.iconPath = new vscode3.ThemeIcon(icons[groupStatus] || "folder");
  }
};
var FeatureItem = class extends vscode3.TreeItem {
  constructor(name, feature, taskStats, isActive) {
    super(name, vscode3.TreeItemCollapsibleState.Collapsed);
    this.name = name;
    this.feature = feature;
    this.taskStats = taskStats;
    this.isActive = isActive;
    const statusLabel = feature.status.charAt(0).toUpperCase() + feature.status.slice(1);
    this.description = `${statusLabel} \xB7 ${taskStats.done}/${taskStats.total}`;
    this.contextValue = `feature-${feature.status}`;
    this.iconPath = new vscode3.ThemeIcon(STATUS_ICONS[feature.status] || "package");
    if (isActive) {
      this.resourceUri = vscode3.Uri.parse("hive:active");
    }
  }
};
var PlanItem = class extends vscode3.TreeItem {
  constructor(featureName, planPath, featureStatus, commentCount) {
    super("Plan", vscode3.TreeItemCollapsibleState.None);
    this.featureName = featureName;
    this.planPath = planPath;
    this.featureStatus = featureStatus;
    this.commentCount = commentCount;
    this.description = commentCount > 0 ? `${commentCount} comment(s)` : "";
    this.contextValue = featureStatus === "planning" ? "plan-draft" : "plan-approved";
    this.iconPath = new vscode3.ThemeIcon("file-text");
    this.command = {
      command: "vscode.open",
      title: "Open Plan",
      arguments: [vscode3.Uri.file(planPath)]
    };
  }
};
var OverviewItem = class extends vscode3.TreeItem {
  constructor(featureName, overviewPath, commentCount) {
    super("Overview", vscode3.TreeItemCollapsibleState.None);
    this.featureName = featureName;
    this.overviewPath = overviewPath;
    this.commentCount = commentCount;
    this.description = commentCount > 0 ? `${commentCount} comment(s)` : "";
    this.contextValue = "overview-file";
    this.iconPath = new vscode3.ThemeIcon("book");
    this.command = {
      command: "vscode.open",
      title: "Open Overview",
      arguments: [vscode3.Uri.file(overviewPath)]
    };
  }
};
var ContextFolderItem = class extends vscode3.TreeItem {
  constructor(featureName, contextPath, fileCount) {
    super("Context", fileCount > 0 ? vscode3.TreeItemCollapsibleState.Collapsed : vscode3.TreeItemCollapsibleState.None);
    this.featureName = featureName;
    this.contextPath = contextPath;
    this.fileCount = fileCount;
    this.description = fileCount > 0 ? `${fileCount} file(s)` : "";
    this.contextValue = "context-folder";
    this.iconPath = new vscode3.ThemeIcon("folder");
  }
};
var ContextFileItem = class extends vscode3.TreeItem {
  constructor(filename, filePath) {
    super(filename, vscode3.TreeItemCollapsibleState.None);
    this.filename = filename;
    this.filePath = filePath;
    this.contextValue = "context-file";
    this.iconPath = new vscode3.ThemeIcon(filename.endsWith(".md") ? "markdown" : "file");
    this.command = {
      command: "vscode.open",
      title: "Open File",
      arguments: [vscode3.Uri.file(filePath)]
    };
  }
};
var TasksGroupItem = class extends vscode3.TreeItem {
  constructor(featureName, tasks) {
    super("Tasks", tasks.length > 0 ? vscode3.TreeItemCollapsibleState.Collapsed : vscode3.TreeItemCollapsibleState.None);
    this.featureName = featureName;
    this.tasks = tasks;
    const done = tasks.filter((t) => t.status.status === "done").length;
    this.description = `${done}/${tasks.length}`;
    this.contextValue = "tasks-group";
    this.iconPath = new vscode3.ThemeIcon("checklist");
  }
};
var TaskItem = class extends vscode3.TreeItem {
  constructor(featureName, folder, status, specPath, reportPath) {
    const name = folder.replace(/^\d+-/, "");
    const hasFiles = specPath !== null || reportPath !== null;
    super(name, hasFiles ? vscode3.TreeItemCollapsibleState.Collapsed : vscode3.TreeItemCollapsibleState.None);
    this.featureName = featureName;
    this.folder = folder;
    this.status = status;
    this.specPath = specPath;
    this.reportPath = reportPath;
    this.description = status.summary || "";
    this.contextValue = `task-${status.status}${status.origin === "manual" ? "-manual" : ""}`;
    const iconName = STATUS_ICONS[status.status] || "circle-outline";
    this.iconPath = new vscode3.ThemeIcon(iconName);
    this.tooltip = new vscode3.MarkdownString();
    this.tooltip.appendMarkdown(`**${folder}**

`);
    this.tooltip.appendMarkdown(`Status: ${status.status}

`);
    this.tooltip.appendMarkdown(`Origin: ${status.origin}

`);
    if (status.summary) {
      this.tooltip.appendMarkdown(`Summary: ${status.summary}`);
    }
  }
};
var TaskFileItem = class extends vscode3.TreeItem {
  constructor(filename, filePath) {
    super(filename, vscode3.TreeItemCollapsibleState.None);
    this.filename = filename;
    this.filePath = filePath;
    this.contextValue = "task-file";
    this.iconPath = new vscode3.ThemeIcon("markdown");
    this.command = {
      command: "vscode.open",
      title: "Open File",
      arguments: [vscode3.Uri.file(filePath)]
    };
  }
};
var CopilotArtifactsGroupItem = class extends vscode3.TreeItem {
  constructor(workspaceRoot) {
    super("Copilot Artifacts", vscode3.TreeItemCollapsibleState.Collapsed);
    this.workspaceRoot = workspaceRoot;
    this.contextValue = "copilot-artifacts";
    this.iconPath = new vscode3.ThemeIcon("github");
  }
};
var ArtifactFileItem = class extends vscode3.TreeItem {
  constructor(label, filePath, iconName) {
    super(label, vscode3.TreeItemCollapsibleState.None);
    this.filePath = filePath;
    this.iconPath = new vscode3.ThemeIcon(iconName);
    this.command = {
      command: "vscode.open",
      title: "Open",
      arguments: [vscode3.Uri.file(filePath)]
    };
  }
};
var ArtifactCategoryItem = class extends vscode3.TreeItem {
  constructor(label, files, iconName) {
    super(label, files.length > 0 ? vscode3.TreeItemCollapsibleState.Collapsed : vscode3.TreeItemCollapsibleState.None);
    this.files = files;
    this.description = `${files.length}`;
    this.iconPath = new vscode3.ThemeIcon(iconName);
  }
};
var HiveSidebarProvider = class {
  constructor(workspaceRoot) {
    this.workspaceRoot = workspaceRoot;
  }
  _onDidChangeTreeData = new vscode3.EventEmitter();
  onDidChangeTreeData = this._onDidChangeTreeData.event;
  refresh() {
    this._onDidChangeTreeData.fire(void 0);
  }
  getTreeItem(element) {
    return element;
  }
  async getChildren(element) {
    if (!element) {
      const items = [
        new ActionItem("Init Skills", "hive.initNest", "symbol-misc")
      ];
      const githubDir = path6.join(this.workspaceRoot, ".github");
      if (fs6.existsSync(githubDir)) {
        items.push(new CopilotArtifactsGroupItem(this.workspaceRoot));
      }
      const statusGroups = await this.getStatusGroups();
      return [...items, ...statusGroups];
    }
    if (element instanceof ActionItem) {
      return [];
    }
    if (element instanceof StatusGroupItem) {
      return element.features;
    }
    if (element instanceof FeatureItem) {
      return this.getFeatureChildren(element.name);
    }
    if (element instanceof CopilotArtifactsGroupItem) {
      return this.getCopilotArtifactCategories(element.workspaceRoot);
    }
    if (element instanceof ArtifactCategoryItem) {
      return element.files;
    }
    if (element instanceof ContextFolderItem) {
      return this.getContextFiles(element.featureName, element.contextPath);
    }
    if (element instanceof TasksGroupItem) {
      return this.getTasks(element.featureName, element.tasks);
    }
    if (element instanceof TaskItem) {
      return this.getTaskFiles(element);
    }
    return [];
  }
  getStatusGroups() {
    const features = this.getAllFeatures();
    const inProgress = [];
    const pending = [];
    const completed = [];
    for (const feature of features) {
      if (feature.feature.status === "executing") {
        inProgress.push(feature);
      } else if (feature.feature.status === "planning" || feature.feature.status === "approved") {
        pending.push(feature);
      } else if (feature.feature.status === "completed") {
        completed.push(feature);
      }
    }
    const groups = [];
    if (inProgress.length > 0) {
      groups.push(new StatusGroupItem("In Progress", "in_progress", inProgress, false));
    }
    if (pending.length > 0) {
      groups.push(new StatusGroupItem("Pending", "pending", pending, false));
    }
    if (completed.length > 0) {
      groups.push(new StatusGroupItem("Completed", "completed", completed, true));
    }
    return groups;
  }
  getAllFeatures() {
    const activeFeature = this.getActiveFeature();
    const features = [];
    const dirs = listFeatureDirectories(this.workspaceRoot);
    for (const dir of dirs) {
      const featureJsonPath = path6.join(getFeaturePath(this.workspaceRoot, dir.logicalName), "feature.json");
      if (!fs6.existsSync(featureJsonPath)) continue;
      const feature = JSON.parse(fs6.readFileSync(featureJsonPath, "utf-8"));
      const taskStats = this.getTaskStats(dir.logicalName);
      const isActive = dir.logicalName === activeFeature;
      features.push(new FeatureItem(dir.logicalName, feature, taskStats, isActive));
    }
    features.sort((a, b) => {
      if (a.isActive && !b.isActive) return -1;
      if (!a.isActive && b.isActive) return 1;
      return a.name.localeCompare(b.name);
    });
    return features;
  }
  getFeatureChildren(featureName) {
    const featurePath = getFeaturePath(this.workspaceRoot, featureName);
    const items = [];
    const featureJsonPath = path6.join(featurePath, "feature.json");
    const feature = JSON.parse(fs6.readFileSync(featureJsonPath, "utf-8"));
    const planPath = path6.join(featurePath, "plan.md");
    if (fs6.existsSync(planPath)) {
      const commentCount = this.getCommentCount(featureName, "plan");
      items.push(new PlanItem(featureName, planPath, feature.status, commentCount));
    }
    const contextPath = path6.join(featurePath, "context");
    const contextFiles = fs6.existsSync(contextPath) ? fs6.readdirSync(contextPath).filter((f) => !f.startsWith(".") && f !== "overview.md") : [];
    const overviewPath = path6.join(contextPath, "overview.md");
    if (fs6.existsSync(overviewPath)) {
      const commentCount = this.getCommentCount(featureName, "overview");
      items.push(new OverviewItem(featureName, overviewPath, commentCount));
    }
    items.push(new ContextFolderItem(featureName, contextPath, contextFiles.length));
    const tasks = this.getTaskList(featureName);
    items.push(new TasksGroupItem(featureName, tasks));
    return items;
  }
  getCopilotArtifactCategories(workspaceRoot) {
    const githubRoot = path6.join(workspaceRoot, ".github");
    const agentsDir = path6.join(githubRoot, "agents");
    const skillsDir = path6.join(githubRoot, "skills");
    const hooksDir = path6.join(githubRoot, "hooks");
    const instructionsDir = path6.join(githubRoot, "instructions");
    const pluginPath = path6.join(workspaceRoot, "plugin.json");
    const categories = [
      new ArtifactCategoryItem(
        "Agents",
        this.getArtifactFiles(agentsDir, (file) => file.endsWith(".agent.md"), "person"),
        "person"
      ),
      new ArtifactCategoryItem(
        "Skills",
        this.getArtifactFiles(skillsDir, (file) => file === "SKILL.md", "book", true),
        "book"
      ),
      new ArtifactCategoryItem(
        "Hooks",
        this.getArtifactFiles(hooksDir, (file) => file.endsWith(".json"), "zap"),
        "zap"
      ),
      new ArtifactCategoryItem(
        "Instructions",
        this.getArtifactFiles(instructionsDir, (file) => file.endsWith(".instructions.md"), "note"),
        "note"
      )
    ];
    if (fs6.existsSync(pluginPath)) {
      categories.push(new ArtifactFileItem("Plugin Manifest", pluginPath, "package"));
    }
    return categories;
  }
  getArtifactFiles(basePath, matches, iconName, nestedSkillDirs = false) {
    if (!fs6.existsSync(basePath)) return [];
    if (nestedSkillDirs) {
      return fs6.readdirSync(basePath, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => path6.join(basePath, entry.name, "SKILL.md")).filter((filePath) => fs6.existsSync(filePath)).map((filePath) => new ArtifactFileItem(path6.basename(path6.dirname(filePath)), filePath, iconName)).sort((a, b) => String(a.label).localeCompare(String(b.label)));
    }
    return fs6.readdirSync(basePath, { withFileTypes: true }).filter((entry) => entry.isFile() && matches(entry.name)).map((entry) => new ArtifactFileItem(entry.name, path6.join(basePath, entry.name), iconName)).sort((a, b) => String(a.label).localeCompare(String(b.label)));
  }
  getContextFiles(featureName, contextPath) {
    if (!fs6.existsSync(contextPath)) return [];
    return fs6.readdirSync(contextPath).filter((f) => !f.startsWith(".") && f !== "overview.md").map((f) => new ContextFileItem(f, path6.join(contextPath, f)));
  }
  getTasks(featureName, tasks) {
    const featurePath = getFeaturePath(this.workspaceRoot, featureName);
    return tasks.map((t) => {
      const taskDir = path6.join(featurePath, "tasks", t.folder);
      const specPath = path6.join(taskDir, "spec.md");
      const reportPath = path6.join(taskDir, "report.md");
      const hasSpec = fs6.existsSync(specPath);
      const hasReport = fs6.existsSync(reportPath);
      return new TaskItem(featureName, t.folder, t.status, hasSpec ? specPath : null, hasReport ? reportPath : null);
    });
  }
  getTaskFiles(taskItem) {
    const items = [];
    if (taskItem.specPath) {
      items.push(new TaskFileItem("spec.md", taskItem.specPath));
    }
    if (taskItem.reportPath) {
      items.push(new TaskFileItem("report.md", taskItem.reportPath));
    }
    return items;
  }
  getTaskList(featureName) {
    const tasksPath = path6.join(getFeaturePath(this.workspaceRoot, featureName), "tasks");
    if (!fs6.existsSync(tasksPath)) return [];
    const folders = fs6.readdirSync(tasksPath, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
    return folders.map((folder) => {
      const statusPath = path6.join(tasksPath, folder, "status.json");
      const status = fs6.existsSync(statusPath) ? JSON.parse(fs6.readFileSync(statusPath, "utf-8")) : { status: "pending", origin: "plan" };
      return { folder, status };
    });
  }
  getTaskStats(featureName) {
    const tasks = this.getTaskList(featureName);
    return {
      total: tasks.length,
      done: tasks.filter((t) => t.status.status === "done").length
    };
  }
  getActiveFeature() {
    const activePath = path6.join(this.workspaceRoot, ".hive", "active-feature");
    const configuredActive = fs6.existsSync(activePath) ? fs6.readFileSync(activePath, "utf-8").trim() : null;
    if (configuredActive) {
      const feature = this.readFeature(configuredActive);
      if (feature && feature.status !== "completed") {
        return configuredActive;
      }
    }
    const available = listFeatureDirectories(this.workspaceRoot).map((entry) => entry.logicalName).filter((name) => {
      const feature = this.readFeature(name);
      return feature !== null && feature.status !== "completed";
    }).sort((a, b) => a.localeCompare(b));
    return available[0] ?? null;
  }
  readFeature(featureName) {
    const featureJsonPath = path6.join(getFeaturePath(this.workspaceRoot, featureName), "feature.json");
    if (!fs6.existsSync(featureJsonPath)) return null;
    return JSON.parse(fs6.readFileSync(featureJsonPath, "utf-8"));
  }
  getCommentCount(featureName, document2) {
    const featurePath = getFeaturePath(this.workspaceRoot, featureName);
    const commentsPath = document2 === "plan" ? this.firstExistingPath([
      path6.join(featurePath, "comments", "plan.json"),
      path6.join(featurePath, "comments.json")
    ]) : path6.join(featurePath, "comments", "overview.json");
    if (!commentsPath || !fs6.existsSync(commentsPath)) return 0;
    try {
      const data = JSON.parse(fs6.readFileSync(commentsPath, "utf-8"));
      return data.threads?.length || 0;
    } catch {
      return 0;
    }
  }
  firstExistingPath(paths) {
    return paths.find((candidate) => fs6.existsSync(candidate)) ?? null;
  }
};

// src/providers/planCommentController.ts
var vscode4 = __toESM(require("vscode"));
var fs9 = __toESM(require("fs"));
var path7 = __toESM(require("path"));
var PlanCommentController = class {
  constructor(workspaceRoot) {
    this.workspaceRoot = workspaceRoot;
    this.normalizedWorkspaceRoot = this.normalizePath(workspaceRoot);
    this.controller = vscode4.comments.createCommentController(
      "hive-plan-review",
      "Hive Review"
    );
    this.controller.commentingRangeProvider = {
      provideCommentingRanges: (document2) => {
        if (!this.getReviewTarget(document2.fileName)) return [];
        return [new vscode4.Range(0, 0, document2.lineCount - 1, 0)];
      }
    };
    const patterns = [
      new vscode4.RelativePattern(workspaceRoot, ".hive/features/*/comments.json"),
      new vscode4.RelativePattern(workspaceRoot, ".hive/features/*/comments/*.json")
    ];
    const rootWatcher = vscode4.workspace.createFileSystemWatcher(patterns[0]);
    const nestedWatcher = vscode4.workspace.createFileSystemWatcher(patterns[1]);
    rootWatcher.onDidChange((uri) => this.onCommentsFileChanged(uri));
    rootWatcher.onDidDelete((uri) => this.onCommentsFileChanged(uri));
    nestedWatcher.onDidChange((uri) => this.onCommentsFileChanged(uri));
    nestedWatcher.onDidDelete((uri) => this.onCommentsFileChanged(uri));
    this.commentsWatchers = [rootWatcher, nestedWatcher];
  }
  controller;
  threads = /* @__PURE__ */ new Map();
  commentsWatchers = [];
  normalizedWorkspaceRoot;
  onCommentsFileChanged(commentsUri) {
    const target = this.getCommentsTarget(commentsUri.fsPath);
    if (!target) return;
    this.loadComments(vscode4.Uri.file(this.getDocumentPath(target.featureName, target.document)));
  }
  registerCommands(context) {
    context.subscriptions.push(
      this.controller,
      vscode4.commands.registerCommand("hive.comment.create", (reply) => {
        this.createComment(reply);
      }),
      vscode4.commands.registerCommand("hive.comment.reply", (reply) => {
        this.replyToComment(reply);
      }),
      vscode4.commands.registerCommand("hive.comment.resolve", (thread) => {
        thread.dispose();
        this.saveComments(thread.uri);
      }),
      vscode4.commands.registerCommand("hive.comment.delete", (comment) => {
        for (const [id, thread] of this.threads) {
          const commentIndex = thread.comments.findIndex((c) => c === comment);
          if (commentIndex !== -1) {
            thread.comments = thread.comments.filter((c) => c !== comment);
            if (thread.comments.length === 0) {
              thread.dispose();
              this.threads.delete(id);
            }
            this.saveComments(thread.uri);
            break;
          }
        }
      }),
      vscode4.workspace.onDidOpenTextDocument((doc) => {
        if (this.getReviewTarget(doc.fileName)) {
          this.loadComments(doc.uri);
        }
      }),
      vscode4.workspace.onDidSaveTextDocument((doc) => {
        if (this.getReviewTarget(doc.fileName)) {
          this.saveComments(doc.uri);
        }
      })
    );
    vscode4.workspace.textDocuments.forEach((doc) => {
      if (this.getReviewTarget(doc.fileName)) {
        this.loadComments(doc.uri);
      }
    });
  }
  getReviewTarget(filePath) {
    const normalized = this.normalizePath(filePath);
    const normalizedWorkspace = this.normalizedWorkspaceRoot.replace(/\/+$/, "");
    const compareNormalized = process.platform === "win32" ? normalized.toLowerCase() : normalized;
    const compareWorkspace = process.platform === "win32" ? normalizedWorkspace.toLowerCase() : normalizedWorkspace;
    if (!compareNormalized.startsWith(`${compareWorkspace}/`)) return null;
    const planMatch = normalized.match(/\.hive\/features\/([^/]+)\/plan\.md$/);
    if (planMatch) {
      return { featureName: planMatch[1], document: "plan" };
    }
    const overviewMatch = normalized.match(/\.hive\/features\/([^/]+)\/context\/overview\.md$/);
    if (overviewMatch) {
      return { featureName: overviewMatch[1], document: "overview" };
    }
    return null;
  }
  getCommentsTarget(filePath) {
    const normalized = this.normalizePath(filePath);
    const reviewMatch = normalized.match(/\.hive\/features\/([^/]+)\/comments\/(plan|overview)\.json$/);
    if (reviewMatch) {
      return { featureName: reviewMatch[1], document: reviewMatch[2] };
    }
    const legacyMatch = normalized.match(/\.hive\/features\/([^/]+)\/comments\.json$/);
    if (legacyMatch) {
      return { featureName: legacyMatch[1], document: "plan" };
    }
    return null;
  }
  normalizePath(filePath) {
    return filePath.replace(/\\/g, "/");
  }
  isSamePath(left, right) {
    const normalizedLeft = this.normalizePath(left);
    const normalizedRight = this.normalizePath(right);
    if (process.platform === "win32") {
      return normalizedLeft.toLowerCase() === normalizedRight.toLowerCase();
    }
    return normalizedLeft === normalizedRight;
  }
  createComment(reply) {
    const range = reply.thread.range ?? new vscode4.Range(0, 0, 0, 0);
    const thread = this.controller.createCommentThread(
      reply.thread.uri,
      range,
      [{
        body: new vscode4.MarkdownString(reply.text),
        author: { name: "You" },
        mode: vscode4.CommentMode.Preview
      }]
    );
    thread.canReply = true;
    thread.collapsibleState = vscode4.CommentThreadCollapsibleState.Expanded;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.threads.set(id, thread);
    this.saveComments(reply.thread.uri);
    reply.thread.dispose();
  }
  replyToComment(reply) {
    const newComment = {
      body: new vscode4.MarkdownString(reply.text),
      author: { name: "You" },
      mode: vscode4.CommentMode.Preview
    };
    reply.thread.comments = [...reply.thread.comments, newComment];
    this.saveComments(reply.thread.uri);
  }
  getCommentsPath(uri) {
    const target = this.getReviewTarget(uri.fsPath);
    if (!target) return null;
    return path7.join(this.workspaceRoot, ".hive", "features", target.featureName, "comments", `${target.document}.json`);
  }
  getReadableCommentsPath(uri) {
    const target = this.getReviewTarget(uri.fsPath);
    if (!target) return null;
    if (target.document === "plan") {
      const canonicalPath = path7.join(this.workspaceRoot, ".hive", "features", target.featureName, "comments", "plan.json");
      if (fs9.existsSync(canonicalPath)) {
        return canonicalPath;
      }
      const legacyPath = path7.join(this.workspaceRoot, ".hive", "features", target.featureName, "comments.json");
      if (fs9.existsSync(legacyPath)) {
        return legacyPath;
      }
      return canonicalPath;
    }
    return path7.join(this.workspaceRoot, ".hive", "features", target.featureName, "comments", `${target.document}.json`);
  }
  getDocumentPath(featureName, document2) {
    return document2 === "overview" ? path7.join(this.workspaceRoot, ".hive", "features", featureName, "context", "overview.md") : path7.join(this.workspaceRoot, ".hive", "features", featureName, "plan.md");
  }
  loadComments(uri) {
    const commentsPath = this.getReadableCommentsPath(uri);
    this.threads.forEach((thread, id) => {
      if (this.isSamePath(thread.uri.fsPath, uri.fsPath)) {
        thread.dispose();
        this.threads.delete(id);
      }
    });
    if (!commentsPath || !fs9.existsSync(commentsPath)) return;
    try {
      const data = JSON.parse(fs9.readFileSync(commentsPath, "utf-8"));
      for (const stored of data.threads) {
        const comments2 = [
          {
            body: new vscode4.MarkdownString(stored.body),
            author: { name: "You" },
            mode: vscode4.CommentMode.Preview
          },
          ...stored.replies.map((r) => ({
            body: new vscode4.MarkdownString(r),
            author: { name: "You" },
            mode: vscode4.CommentMode.Preview
          }))
        ];
        const thread = this.controller.createCommentThread(
          uri,
          new vscode4.Range(stored.line, 0, stored.line, 0),
          comments2
        );
        thread.canReply = true;
        thread.collapsibleState = vscode4.CommentThreadCollapsibleState.Expanded;
        this.threads.set(stored.id, thread);
      }
    } catch (error) {
      console.error("Failed to load comments:", error);
    }
  }
  saveComments(uri) {
    const commentsPath = this.getCommentsPath(uri);
    if (!commentsPath) return;
    const threads = [];
    this.threads.forEach((thread, id) => {
      if (!this.isSamePath(thread.uri.fsPath, uri.fsPath)) return;
      if (thread.comments.length === 0) return;
      const [first2, ...rest] = thread.comments;
      const line = thread.range?.start.line ?? 0;
      const getBodyText = (body) => typeof body === "string" ? body : body.value;
      threads.push({
        id,
        line,
        body: getBodyText(first2.body),
        replies: rest.map((c) => getBodyText(c.body))
      });
    });
    const data = { threads };
    try {
      fs9.mkdirSync(path7.dirname(commentsPath), { recursive: true });
      fs9.writeFileSync(commentsPath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error("Failed to save comments:", error);
    }
  }
  dispose() {
    this.commentsWatchers.forEach((watcher) => watcher.dispose());
    this.controller.dispose();
  }
};

// src/tools/base.ts
var vscode5 = __toESM(require("vscode"));
function createToolResult(content) {
  return new vscode5.LanguageModelToolResult([
    new vscode5.LanguageModelTextPart(content)
  ]);
}
function registerTool(context, registration) {
  const tool = {
    prepareInvocation(options, _token) {
      const invocationMessage = `Executing ${registration.displayName}...`;
      if (registration.destructive) {
        return {
          invocationMessage,
          confirmationMessages: {
            title: registration.displayName,
            message: new vscode5.MarkdownString(
              `This action will modify your project. Continue?`
            )
          }
        };
      }
      return { invocationMessage };
    },
    async invoke(options, token) {
      try {
        const result = await registration.invoke(options.input, token);
        return createToolResult(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return createToolResult(`Error: ${message}`);
      }
    }
  };
  return vscode5.lm.registerTool(registration.name, tool);
}
function registerAllTools(context, registrations) {
  for (const reg of registrations) {
    const disposable = registerTool(context, reg);
    context.subscriptions.push(disposable);
  }
}

// src/tools/feature.ts
function getFeatureTools(workspaceRoot) {
  const featureService = new FeatureService(workspaceRoot);
  return [
    {
      name: "hive_feature_create",
      displayName: "Create Hive Feature",
      modelDescription: "Create a new Hive feature for plan-first development. Use at the start of any new work to establish a planning workspace with context, plan, and task tracking.",
      inputSchema: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Feature name (kebab-case recommended)"
          },
          ticket: {
            type: "string",
            description: "Optional ticket/issue reference"
          }
        },
        required: ["name"]
      },
      invoke: async (input) => {
        const { name, ticket } = input;
        const feature = featureService.create(name, ticket);
        return JSON.stringify({
          success: true,
          feature: feature.name,
          status: feature.status,
          message: `Feature '${name}' created. Next: write a plan with hive_plan_write.`
        });
      }
    },
    {
      name: "hive_feature_complete",
      displayName: "Complete Hive Feature",
      modelDescription: "Mark a feature as completed. Use when all tasks are done and the feature is ready for final integration. This is irreversible.",
      destructive: true,
      inputSchema: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Feature name to mark as completed"
          }
        },
        required: ["name"]
      },
      invoke: async (input) => {
        const { name } = input;
        const feature = featureService.complete(name);
        return JSON.stringify({
          success: true,
          feature: feature.name,
          status: feature.status,
          completedAt: feature.completedAt
        });
      }
    }
  ];
}

// src/tools/plan.ts
function getPlanTools(workspaceRoot) {
  const featureService = new FeatureService(workspaceRoot);
  const planService = new PlanService(workspaceRoot);
  const contextService = new ContextService(workspaceRoot);
  return [
    {
      name: "hive_plan_write",
      displayName: "Write Hive Plan",
      modelDescription: "Write or update the plan.md for a feature. plan.md is the human-facing review surface and execution truth. Include a concise summary before ## Tasks, and optionally include a Mermaid dependency or sequence overview in that pre-task summary only. Use markdown with ### numbered headers for tasks. Clears existing plan review comments when plan is rewritten.",
      inputSchema: {
        type: "object",
        properties: {
          feature: {
            type: "string",
            description: "Feature name"
          },
          content: {
            type: "string",
            description: "Plan content in markdown. Use ### 1. Task Name format for tasks."
          }
        },
        required: ["feature", "content"]
      },
      invoke: async (input) => {
        const { feature, content } = input;
        const planPath = planService.write(feature, content);
        let contextWarning = "";
        try {
          const contexts = contextService.list(feature);
          if (contexts.length === 0) {
            contextWarning += "\n\n\u26A0\uFE0F WARNING: No context files created yet. If workers will need durable notes, use hive_context_write to document research findings, user decisions, architecture constraints, or references to existing code.";
          }
        } catch {
          contextWarning = "\n\n\u26A0\uFE0F WARNING: Could not check context files. If needed, use hive_context_write to document durable findings for workers.";
        }
        return JSON.stringify({
          success: true,
          path: planPath,
          message: `Plan written. User can review plan.md as the human-facing surface and execution truth. When ready, use hive_plan_approve.${contextWarning}`
        });
      }
    },
    {
      name: "hive_plan_read",
      displayName: "Read Hive Plan",
      modelDescription: "Read the plan.md and related review comments for a feature. Use to check the in-plan human-facing summary, task structure, status, and user feedback before making changes.",
      readOnly: true,
      inputSchema: {
        type: "object",
        properties: {
          feature: {
            type: "string",
            description: "Feature name"
          }
        },
        required: ["feature"]
      },
      invoke: async (input) => {
        const { feature } = input;
        const result = planService.read(feature);
        if (!result) {
          return JSON.stringify({ error: `No plan found for feature '${feature}'` });
        }
        return JSON.stringify({
          content: result.content,
          status: result.status,
          comments: result.comments,
          commentCount: result.comments.length
        });
      }
    },
    {
      name: "hive_plan_approve",
      displayName: "Approve Hive Plan",
      modelDescription: "Approve a plan for execution. Use after the user has reviewed plan.md, including the human-facing summary before ## Tasks, and resolved any comments. Changes feature status to approved.",
      inputSchema: {
        type: "object",
        properties: {
          feature: {
            type: "string",
            description: "Feature name"
          }
        },
        required: ["feature"]
      },
      invoke: async (input) => {
        const { feature } = input;
        let contexts = [];
        let contextWarning = "";
        try {
          contexts = contextService.list(feature);
          if (contexts.length === 0) {
            contextWarning += "\n\n\u26A0\uFE0F Note: No context files found. Consider using hive_context_write during execution to document findings for future reference.";
          }
        } catch {
        }
        try {
          planService.approve(feature);
        } catch (error) {
          if (error instanceof Error && /unresolved review comments/i.test(error.message)) {
            const hasOverview = contexts.some((context) => context.name === "overview");
            const reviewCounts = featureService.getInfo(feature)?.reviewCounts ?? { plan: 0, overview: 0 };
            const planComments = reviewCounts.plan;
            const overviewComments = hasOverview ? reviewCounts.overview : 0;
            const unresolvedTotal = planComments + overviewComments;
            const documents = [
              planComments > 0 ? `plan (${planComments})` : null,
              overviewComments > 0 ? `overview (${overviewComments})` : null
            ].filter(Boolean).join(", ");
            return JSON.stringify({
              success: false,
              message: `Cannot approve - ${unresolvedTotal} unresolved review comment(s) remain across ${documents}. Address them first.`
            });
          }
          throw error;
        }
        return JSON.stringify({
          success: true,
          message: `Plan approved. Use hive_tasks_sync to generate tasks from the plan.${contextWarning}`
        });
      }
    }
  ];
}

// src/tools/task.ts
function getTaskTools(workspaceRoot) {
  const taskService = new TaskService(workspaceRoot);
  return [
    {
      name: "hive_tasks_sync",
      displayName: "Sync Hive Tasks",
      modelDescription: "Generate tasks from approved plan.md by parsing ### numbered headers. Creates task folders with status.json. When refreshPending is true, rewrites pending plan tasks from current plan (updates dependsOn, planTitle, spec.md) and deletes pending tasks removed from plan. Preserves manual tasks and tasks with execution history. Returns summary of created/removed/kept tasks.",
      inputSchema: {
        type: "object",
        properties: {
          feature: {
            type: "string",
            description: "Feature name"
          },
          refreshPending: {
            type: "boolean",
            description: "When true, refresh pending plan tasks from current plan.md (rewrite dependsOn, planTitle, spec.md) and delete pending tasks removed from plan. Manual tasks and tasks with execution history are preserved."
          }
        },
        required: ["feature"]
      },
      invoke: async (input, _token) => {
        const { feature, refreshPending } = input;
        const result = taskService.sync(feature, { refreshPending });
        return JSON.stringify({
          created: result.created.length,
          removed: result.removed.length,
          kept: result.kept.length,
          manual: result.manual.length,
          message: `${result.created.length} tasks created, ${result.removed.length} removed, ${result.kept.length} kept, ${result.manual.length} manual`,
          hints: [
            "Use hive_worktree_start to begin work on a runnable task.",
            "Check task dependencies with hive_status to find runnable tasks.",
            "A task is runnable when all its dependsOn tasks have status done.",
            "Update via hive_task_update when work progresses."
          ]
        });
      }
    },
    {
      name: "hive_task_create",
      displayName: "Create Manual Task",
      modelDescription: "Create a task manually, not from the plan. Use for ad-hoc work or tasks discovered during execution. Manual tasks always have explicit dependsOn (default: []) to avoid accidental implicit sequential dependencies. Provide structured metadata for a useful spec.md and worker prompt.",
      inputSchema: {
        type: "object",
        properties: {
          feature: {
            type: "string",
            description: "Feature name"
          },
          name: {
            type: "string",
            description: "Task name"
          },
          order: {
            type: "number",
            description: "Optional order number for the task"
          },
          description: {
            type: "string",
            description: "What the worker needs to achieve"
          },
          goal: {
            type: "string",
            description: "Why this task exists and what done means"
          },
          acceptanceCriteria: {
            type: "array",
            items: { type: "string" },
            description: "Specific observable outcomes"
          },
          references: {
            type: "array",
            items: { type: "string" },
            description: "File paths or line ranges relevant to this task"
          },
          files: {
            type: "array",
            items: { type: "string" },
            description: "Files likely to be modified"
          },
          dependsOn: {
            type: "array",
            items: { type: "string" },
            description: "Task folder names this task depends on (default: [] for no dependencies)"
          },
          reason: {
            type: "string",
            description: 'Why this task was created (e.g., "Required by Hygienic review")'
          },
          source: {
            type: "string",
            enum: ["review", "operator", "ad_hoc"],
            description: "Origin of this task"
          }
        },
        required: ["feature", "name"]
      },
      invoke: async (input, _token) => {
        const { feature, name, order, ...metadataFields } = input;
        const metadata = {};
        if (metadataFields.description) metadata.description = metadataFields.description;
        if (metadataFields.goal) metadata.goal = metadataFields.goal;
        if (metadataFields.acceptanceCriteria) metadata.acceptanceCriteria = metadataFields.acceptanceCriteria;
        if (metadataFields.references) metadata.references = metadataFields.references;
        if (metadataFields.files) metadata.files = metadataFields.files;
        if (metadataFields.dependsOn) metadata.dependsOn = metadataFields.dependsOn;
        if (metadataFields.reason) metadata.reason = metadataFields.reason;
        if (metadataFields.source) metadata.source = metadataFields.source;
        const folder = taskService.create(feature, name, order, Object.keys(metadata).length > 0 ? metadata : void 0);
        return `Created task "${folder}" with status: pending, dependsOn: [${(metadata.dependsOn ?? []).join(", ")}]
Reminder: run hive_worktree_start to work in its worktree, and ensure any subagents work in that worktree too.`;
      }
    },
    {
      name: "hive_task_update",
      displayName: "Update Hive Task",
      modelDescription: "Update a task status (pending/in_progress/done/cancelled) or add a work summary. Returns plain text confirmation. Does NOT merge - use hive_merge for integration.",
      inputSchema: {
        type: "object",
        properties: {
          feature: {
            type: "string",
            description: "Feature name"
          },
          task: {
            type: "string",
            description: "Task folder name"
          },
          status: {
            type: "string",
            enum: ["pending", "in_progress", "done", "cancelled"],
            description: "New status"
          },
          summary: {
            type: "string",
            description: "Summary of what was done"
          }
        },
        required: ["feature", "task"]
      },
      invoke: async (input, _token) => {
        const { feature, task, status, summary } = input;
        const updates = {};
        if (status) updates.status = status;
        if (summary) updates.summary = summary;
        const updated = taskService.update(feature, task, updates);
        const statusMsg = summary ? `. Summary: ${summary}` : "";
        return `Task "${task}" updated to ${updated.status}${statusMsg}`;
      }
    }
  ];
}

// src/tools/exec.ts
var path9 = __toESM(require("path"));
function checkDependencies(taskService, feature, taskFolder) {
  const taskStatus = taskService.getRawStatus(feature, taskFolder);
  if (!taskStatus) {
    return { allowed: true };
  }
  const tasks = taskService.list(feature).map((task) => {
    const status = taskService.getRawStatus(feature, task.folder);
    return {
      folder: task.folder,
      status: task.status,
      dependsOn: status?.dependsOn
    };
  });
  const effectiveDeps = buildEffectiveDependencies(tasks);
  const deps = effectiveDeps.get(taskFolder) ?? [];
  if (deps.length === 0) {
    return { allowed: true };
  }
  const unmetDeps = [];
  for (const depFolder of deps) {
    const depStatus = taskService.getRawStatus(feature, depFolder);
    if (!depStatus || depStatus.status !== "done") {
      unmetDeps.push({
        folder: depFolder,
        status: depStatus?.status ?? "unknown"
      });
    }
  }
  if (unmetDeps.length > 0) {
    const depList = unmetDeps.map((d) => `"${d.folder}" (${d.status})`).join(", ");
    return {
      allowed: false,
      error: `Dependency constraint: Task "${taskFolder}" cannot start - dependencies not done: ${depList}. Only tasks with status 'done' satisfy dependencies.`
    };
  }
  return { allowed: true };
}
function getExecTools(workspaceRoot) {
  const worktreeService = new WorktreeService({
    baseDir: workspaceRoot,
    hiveDir: path9.join(workspaceRoot, ".hive")
  });
  const taskService = new TaskService(workspaceRoot);
  const startWorktree = async ({ feature, task }) => {
    const taskInfo = taskService.get(feature, task);
    if (!taskInfo) {
      return JSON.stringify({
        success: false,
        terminal: true,
        reason: "task_not_found",
        feature,
        task,
        error: `Task "${task}" not found`,
        hints: [
          "Check the task folder name in tasks.json or hive_status output.",
          "Run hive_tasks_sync if the approved plan has changed and tasks need regeneration."
        ]
      });
    }
    if (taskInfo.status === "done") {
      return JSON.stringify({
        success: false,
        terminal: true,
        reason: "task_already_done",
        feature,
        task,
        currentStatus: "done",
        error: `Task "${task}" is already completed (status: done). It cannot be restarted.`,
        hints: [
          "Use hive_merge to integrate the completed task branch if not already merged.",
          "Use hive_status to see all task states and find the next runnable task."
        ]
      });
    }
    if (taskInfo.status === "blocked") {
      return JSON.stringify({
        success: false,
        terminal: true,
        reason: "blocked_resume_required",
        feature,
        task,
        currentStatus: "blocked",
        error: `Task "${task}" is blocked and must be resumed with hive_worktree_create using continueFrom: 'blocked'.`,
        hints: [
          'Ask the user the blocker question, then call hive_worktree_create({ task, continueFrom: "blocked", decision }).',
          "Use hive_status to inspect blocker details before retrying."
        ]
      });
    }
    const depCheck = checkDependencies(taskService, feature, task);
    if (!depCheck.allowed) {
      return JSON.stringify({
        success: false,
        terminal: true,
        reason: "dependencies_not_done",
        feature,
        task,
        error: depCheck.error,
        hints: [
          "Complete the required dependencies before starting this task.",
          "Use hive_status to see current task states."
        ]
      });
    }
    const worktree = await worktreeService.create(feature, task);
    taskService.update(feature, task, { status: "in_progress" });
    return JSON.stringify({
      success: true,
      terminal: false,
      feature,
      task,
      worktreePath: worktree.path,
      branch: worktree.branch,
      message: `Worktree created. Work in ${worktree.path}. When done, use hive_worktree_commit.`,
      hints: [
        "Do all work inside this worktree. Ensure any subagents do the same.",
        "Context files are in .hive/features/<feature>/context/ if you need background."
      ]
    });
  };
  const resumeBlockedWorktree = async ({
    feature,
    task,
    continueFrom,
    decision
  }) => {
    const taskInfo = taskService.get(feature, task);
    if (!taskInfo) {
      return JSON.stringify({
        success: false,
        terminal: true,
        reason: "task_not_found",
        feature,
        task,
        error: `Task "${task}" not found`,
        hints: [
          "Check the task folder name in tasks.json or hive_status output.",
          "Run hive_tasks_sync if the approved plan has changed and tasks need regeneration."
        ]
      });
    }
    if (continueFrom !== "blocked") {
      return JSON.stringify({
        success: false,
        terminal: true,
        reason: "blocked_resume_required",
        feature,
        task,
        currentStatus: taskInfo.status,
        error: "hive_worktree_create is only for resuming blocked tasks.",
        hints: [
          "Use hive_worktree_start({ feature, task }) to start a pending or in-progress task normally.",
          'Use hive_worktree_create({ task, continueFrom: "blocked", decision }) only after hive_status confirms the task is blocked.'
        ]
      });
    }
    if (taskInfo.status !== "blocked") {
      return JSON.stringify({
        success: false,
        terminal: true,
        reason: "task_not_blocked",
        feature,
        task,
        currentStatus: taskInfo.status,
        error: `continueFrom: 'blocked' was specified but task "${task}" is not in blocked state (current status: ${taskInfo.status}).`,
        hints: [
          "Use hive_worktree_start({ feature, task }) for normal starts or re-dispatch.",
          "Use hive_status to verify the current task status before retrying."
        ]
      });
    }
    const worktree = await worktreeService.get(feature, task);
    if (!worktree) {
      return JSON.stringify({
        success: false,
        terminal: true,
        reason: "missing_worktree",
        feature,
        task,
        currentStatus: taskInfo.status,
        error: `Cannot resume blocked task "${task}": no existing worktree record found.`,
        hints: [
          "The worktree may have been removed manually. Use hive_worktree_discard to reset the task to pending, then restart it with hive_worktree_start.",
          "Use hive_status to inspect the current state of the task and its worktree."
        ]
      });
    }
    taskService.update(feature, task, { status: "in_progress" });
    return JSON.stringify({
      success: true,
      terminal: false,
      feature,
      task,
      currentStatus: "in_progress",
      resumedFrom: "blocked",
      decision: decision ?? null,
      worktreePath: worktree.path,
      branch: worktree.branch,
      message: `Blocked task resumed. Continue work in ${worktree.path}. When done, use hive_worktree_commit.`,
      hints: [
        "Continue from the existing worktree state and incorporate the user decision.",
        "Do all work inside this worktree. Ensure any subagents do the same."
      ]
    });
  };
  return [
    {
      name: "hive_worktree_start",
      displayName: "Start Task Worktree",
      modelDescription: "Create a git worktree for a pending/in-progress task. Use for normal task starts.",
      inputSchema: {
        type: "object",
        properties: {
          feature: { type: "string", description: "Feature name" },
          task: { type: "string", description: "Task folder name" }
        },
        required: ["feature", "task"]
      },
      invoke: async (input) => {
        const { feature, task } = input;
        return startWorktree({ feature, task });
      }
    },
    {
      name: "hive_worktree_create",
      displayName: "Resume Blocked Task Worktree",
      modelDescription: 'Resume a blocked task in its existing worktree. Requires continueFrom: "blocked" and a decision.',
      inputSchema: {
        type: "object",
        properties: {
          feature: { type: "string", description: "Feature name" },
          task: { type: "string", description: "Task folder name" },
          continueFrom: { type: "string", enum: ["blocked"], description: "Resume a blocked task" },
          decision: { type: "string", description: "Answer to blocker question when continuing" }
        },
        required: ["feature", "task", "continueFrom"]
      },
      invoke: async (input) => {
        const { feature, task, continueFrom, decision } = input;
        return resumeBlockedWorktree({ feature, task, continueFrom, decision });
      }
    },
    {
      name: "hive_worktree_commit",
      displayName: "Commit Task Worktree",
      modelDescription: "Commit changes in worktree and mark task done. Does NOT merge - use hive_merge for that. Use when task implementation is finished.",
      inputSchema: {
        type: "object",
        properties: {
          feature: { type: "string", description: "Feature name" },
          task: { type: "string", description: "Task folder name" },
          summary: { type: "string", description: "Summary of what was done" },
          message: { type: "string", description: "Optional git commit message; subject/body allowed. Empty uses default." }
        },
        required: ["feature", "task", "summary"]
      },
      invoke: async (input) => {
        const { feature, task, summary, message } = input;
        const commitMessage = message || summary;
        const result = await worktreeService.commitChanges(feature, task, commitMessage);
        if (result.committed) {
          taskService.update(feature, task, { status: "done", summary });
          const reportContent = `# Task Completion Report

**Task:** ${task}
**Status:** Done
**Completed:** ${(/* @__PURE__ */ new Date()).toISOString()}
**Commit:** ${result.sha}

## Summary

${summary}
`;
          taskService.writeReport(feature, task, reportContent);
        }
        return JSON.stringify({
          success: true,
          commitHash: result.sha,
          committed: result.committed,
          message: result.committed ? `Changes committed. Use hive_merge to integrate into main branch.` : result.message || "No changes to commit",
          hints: result.committed ? [
            "Proceed to next task or use hive_merge to integrate changes."
          ] : []
        });
      }
    },
    {
      name: "hive_worktree_discard",
      displayName: "Discard Task Worktree",
      modelDescription: "Discard all changes and remove worktree. Use when task approach is wrong and needs restart. This is destructive and irreversible.",
      destructive: true,
      inputSchema: {
        type: "object",
        properties: {
          feature: { type: "string", description: "Feature name" },
          task: { type: "string", description: "Task folder name" }
        },
        required: ["feature", "task"]
      },
      invoke: async (input) => {
        const { feature, task } = input;
        await worktreeService.remove(feature, task);
        taskService.update(feature, task, { status: "pending", summary: "" });
        return JSON.stringify({
          success: true,
          message: `Worktree removed. Task status reset to pending. Can restart with hive_worktree_start.`
        });
      }
    }
  ];
}

// src/tools/merge.ts
var path10 = __toESM(require("path"));
function getMergeTools(workspaceRoot) {
  const worktreeService = new WorktreeService({
    baseDir: workspaceRoot,
    hiveDir: path10.join(workspaceRoot, ".hive")
  });
  return [
    {
      name: "hive_merge",
      displayName: "Merge Task Branch",
      modelDescription: "Merge a completed task branch into current branch. Supports merge, squash, or rebase strategies. Use after hive_worktree_commit to integrate changes.",
      inputSchema: {
        type: "object",
        properties: {
          feature: { type: "string", description: "Feature name" },
          task: { type: "string", description: "Task folder name" },
          strategy: {
            type: "string",
            enum: ["merge", "squash", "rebase"],
            description: "Merge strategy (default: merge)"
          },
          message: { type: "string", description: "Optional merge commit message for merge/squash only. Empty uses default." }
        },
        required: ["feature", "task"]
      },
      invoke: async (input) => {
        const { feature, task, strategy = "merge", message } = input;
        const result = await worktreeService.merge(feature, task, strategy, message);
        return JSON.stringify({
          success: result.success,
          strategy,
          message: result.success ? "Merge completed." : result.error || "Merge failed."
        });
      }
    }
  ];
}

// src/tools/context.ts
function getContextTools(workspaceRoot) {
  const contextService = new ContextService(workspaceRoot);
  return [
    {
      name: "hive_context_write",
      displayName: "Write Context File",
      modelDescription: 'Write a context file to store research findings, decisions, or reference material. Use name: "overview" for the canonical human-facing summary/history file at context/overview.md; refresh it after major planning or execution milestones while plan.md remains execution truth.',
      inputSchema: {
        type: "object",
        properties: {
          feature: { type: "string", description: "Feature name" },
          name: { type: "string", description: 'Context file name (without .md). Use "overview" for the primary human-facing summary/history file.' },
          content: { type: "string", description: "Context content in markdown" }
        },
        required: ["feature", "name", "content"]
      },
      invoke: async (input) => {
        const { feature, name, content } = input;
        const path16 = contextService.write(feature, name, content);
        return JSON.stringify({
          success: true,
          path: path16,
          message: name === "overview" ? "Overview written as the primary human-facing summary/history file. Keep sections ## At a Glance, ## Workstreams, and ## Revision History current." : "Context file written."
        });
      }
    }
  ];
}

// src/tools/status.ts
var fs10 = __toESM(require("fs"));
var path11 = __toESM(require("path"));
function getStatusTools(workspaceRoot) {
  const featureService = new FeatureService(workspaceRoot);
  const taskService = new TaskService(workspaceRoot);
  const planService = new PlanService(workspaceRoot);
  const contextService = new ContextService(workspaceRoot);
  const invokeStatus = async (input) => {
    const { feature: explicitFeature } = input;
    const feature = explicitFeature || featureService.getActive()?.name;
    if (!feature) {
      return JSON.stringify({
        success: false,
        terminal: true,
        reason: "feature_required",
        error: "No feature specified and no active feature found",
        hint: "Use hive_feature_create to create a new feature"
      });
    }
    const featureData = featureService.get(feature);
    if (!featureData) {
      return JSON.stringify({
        success: false,
        terminal: true,
        reason: "feature_not_found",
        error: `Feature '${feature}' not found`,
        availableFeatures: featureService.list()
      });
    }
    const plan = planService.read(feature);
    const tasks = taskService.list(feature);
    const contextFiles = contextService.list(feature);
    const overview = contextFiles.find((file) => file.name === "overview") ?? null;
    const reviewCounts = readReviewCounts(workspaceRoot, feature);
    const tasksSummary = tasks.map((t) => {
      const rawStatus = taskService.getRawStatus(feature, t.folder);
      return {
        folder: t.folder,
        name: t.folder.replace(/^\d+-/, ""),
        status: t.status,
        summary: t.summary || null,
        origin: t.origin,
        dependsOn: rawStatus?.dependsOn ?? null
      };
    });
    const tasksWithDeps = tasksSummary.map((t) => ({
      folder: t.folder,
      status: t.status,
      dependsOn: t.dependsOn ?? void 0
    }));
    const effectiveDeps = buildEffectiveDependencies(tasksWithDeps);
    const normalizedTasks = tasksWithDeps.map((task) => ({
      ...task,
      dependsOn: effectiveDeps.get(task.folder)
    }));
    const { runnable, blocked } = computeRunnableAndBlocked(normalizedTasks);
    const contextSummary = contextFiles.map((c) => ({
      name: c.name,
      chars: c.content.length,
      updatedAt: c.updatedAt
    }));
    const pendingTasks = tasksSummary.filter((t) => t.status === "pending");
    const inProgressTasks = tasksSummary.filter((t) => t.status === "in_progress");
    const doneTasks = tasksSummary.filter((t) => t.status === "done");
    const planStatus = featureData.status === "planning" ? "draft" : featureData.status === "approved" ? "approved" : featureData.status === "executing" ? "locked" : "none";
    return JSON.stringify({
      feature: {
        name: feature,
        status: featureData.status,
        ticket: featureData.ticket || null,
        createdAt: featureData.createdAt
      },
      plan: {
        exists: !!plan,
        status: planStatus,
        approved: planStatus === "approved" || planStatus === "locked"
      },
      overview: {
        exists: !!overview,
        path: [".hive", "features", feature, "context", "overview.md"].join("/"),
        updatedAt: overview?.updatedAt ?? null
      },
      review: {
        unresolvedTotal: reviewCounts.plan + reviewCounts.overview,
        byDocument: {
          overview: reviewCounts.overview,
          plan: reviewCounts.plan
        }
      },
      tasks: {
        total: tasks.length,
        pending: pendingTasks.length,
        inProgress: inProgressTasks.length,
        done: doneTasks.length,
        list: tasksSummary,
        runnable,
        blockedBy: blocked
      },
      context: {
        fileCount: contextFiles.length,
        files: contextSummary
      },
      nextAction: getNextAction(planStatus, tasksSummary, runnable, !!plan, !!overview)
    });
  };
  const baseStatusTool = {
    displayName: "Get Hive Status",
    modelDescription: "Get comprehensive status of a feature including plan, tasks, and context. Returns JSON with all relevant state for resuming work.",
    readOnly: true,
    inputSchema: {
      type: "object",
      properties: {
        feature: {
          type: "string",
          description: "Feature name (optional, uses active feature if omitted)"
        }
      }
    },
    invoke: invokeStatus
  };
  return [
    {
      name: "hive_status",
      ...baseStatusTool
    },
    {
      name: "hiveStatus",
      ...baseStatusTool
    }
  ];
}
function getNextAction(planStatus, tasks, runnable, hasPlan, hasOverview) {
  if (planStatus === "review") {
    return "Wait for plan approval or revise based on comments";
  }
  if (!hasPlan || planStatus === "draft") {
    return "Write or revise plan with hive_plan_write. Keep plan.md as the human-facing review artifact; pre-task Mermaid overview diagrams are optional.";
  }
  if (tasks.length === 0) {
    return "Generate tasks from plan with hive_tasks_sync";
  }
  const inProgress = tasks.find((t) => t.status === "in_progress");
  if (inProgress) {
    return `Continue work on task: ${inProgress.folder}`;
  }
  if (runnable.length > 1) {
    return `${runnable.length} tasks are ready to start in parallel: ${runnable.join(", ")}`;
  }
  if (runnable.length === 1) {
    return `Start next task with hive_worktree_start: ${runnable[0]}`;
  }
  const pending = tasks.find((t) => t.status === "pending");
  if (pending) {
    return `Pending tasks exist but are blocked by dependencies. Check blockedBy for details.`;
  }
  return "All tasks complete. Review and merge or complete feature.";
}
function readReviewCounts(workspaceRoot, feature) {
  const featurePath = getFeaturePath(workspaceRoot, feature);
  const reviewDir = path11.join(featurePath, "comments");
  const planThreads = readThreads(path11.join(reviewDir, "plan.json")) ?? readThreads(path11.join(featurePath, "comments.json"));
  const overviewThreads = readThreads(path11.join(reviewDir, "overview.json"));
  return {
    plan: planThreads?.length ?? 0,
    overview: overviewThreads?.length ?? 0
  };
}
function readThreads(filePath) {
  if (!fs10.existsSync(filePath)) {
    return null;
  }
  try {
    const data = JSON.parse(fs10.readFileSync(filePath, "utf-8"));
    return data.threads ?? [];
  } catch {
    return [];
  }
}

// src/tools/agentsMd.ts
function getAgentsMdTools(workspaceRoot) {
  return [
    {
      name: "hive_agents_md",
      displayName: "Manage AGENTS.md",
      modelDescription: "Initialize, sync, or apply changes to AGENTS.md. init: scan codebase and generate. sync: propose updates from feature contexts. apply: write approved content.",
      inputSchema: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["init", "sync", "apply"],
            description: "Action to perform"
          },
          feature: {
            type: "string",
            description: "Feature name (required for sync)"
          },
          content: {
            type: "string",
            description: "Content to apply (required for apply)"
          }
        },
        required: ["action"]
      },
      invoke: async (input) => {
        const contextService = new ContextService(workspaceRoot);
        const service = new AgentsMdService(workspaceRoot, contextService);
        const { action, feature, content } = input;
        if (action === "init") {
          return JSON.stringify(await service.init());
        }
        if (action === "sync") {
          if (!feature) {
            return JSON.stringify({ error: "Feature name required for sync" });
          }
          return JSON.stringify(await service.sync(feature));
        }
        if (action === "apply") {
          if (!content) {
            return JSON.stringify({ error: "Content required for apply" });
          }
          return JSON.stringify(service.apply(content));
        }
        return JSON.stringify({ error: `Unknown action: ${action}` });
      }
    }
  ];
}

// src/tools/skill.ts
var fs12 = __toESM(require("fs"));
var path12 = __toESM(require("path"));
function getSkillTools(workspaceRoot) {
  return [
    {
      name: "hive_skill",
      displayName: "Load Hive Skill",
      modelDescription: "Load a skill by name. Returns the SKILL.md content with instructions for the specified workflow skill.",
      readOnly: true,
      inputSchema: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Skill name (e.g. writing-plans, brainstorming)"
          }
        },
        required: ["name"]
      },
      invoke: async (input) => {
        const { name } = input;
        const searchPaths = [
          path12.join(workspaceRoot, ".github", "skills", name, "SKILL.md"),
          path12.join(workspaceRoot, ".claude", "skills", name, "SKILL.md"),
          path12.join(workspaceRoot, ".opencode", "skill", name, "SKILL.md")
        ];
        for (const skillPath of searchPaths) {
          if (fs12.existsSync(skillPath)) {
            return fs12.readFileSync(skillPath, "utf-8");
          }
        }
        return JSON.stringify({
          error: `Skill not found: ${name}`,
          searchedPaths: searchPaths
        });
      }
    }
  ];
}

// src/commands/initNest.ts
var fs13 = __toESM(require("fs"));
var path13 = __toESM(require("path"));
init_agents();

// src/generators/hooks.ts
function buildScript(body) {
  return `#!/usr/bin/env bash
set -e

${body.trim()}
`;
}
function buildHookOutput(configFilename, config, scripts) {
  return {
    configFilename,
    config,
    scripts
  };
}
function generatePlanEnforcementHook() {
  const script = buildScript(`shopt -s nullglob

input_json="$(</dev/stdin)"
tool_name="$(jq -r '(.toolName // .tool?.name // .tool_name // .name // .tool // empty) | strings' <<<"$input_json")"

if [[ "$tool_name" != 'editFiles' && "$tool_name" != 'execute' ]]; then
  exit 0
fi

has_approved_plan=false

for feature_json in .hive/features/*/feature.json; do
  status="$(jq -r '.status // empty' "$feature_json")"
  if [[ "$status" == 'approved' || "$status" == 'executing' ]]; then
    has_approved_plan=true
    break
  fi
done

if [[ "$has_approved_plan" == 'true' ]]; then
  exit 0
fi

jq -n '{ permissionDecision: "deny", message: "No approved Hive plan found. Create and approve a plan first." }'
`);
  return buildHookOutput(
    "hive-plan-enforcement.json",
    {
      version: 1,
      hooks: {
        preToolUse: [
          {
            type: "command",
            command: { bash: ".github/hooks/scripts/check-plan.sh" },
            timeoutSec: 5
          }
        ]
      }
    },
    [
      {
        filename: "check-plan.sh",
        content: script
      }
    ]
  );
}
function generateContextInjectionHook() {
  const script = buildScript(`shopt -s nullglob

active_feature=''

logical_name_for_feature() {
  local feature_json="$1"
  local directory_name logical_name

  logical_name="$(jq -r '.name // empty' "$feature_json")"
  if [[ -n "$logical_name" ]]; then
    printf '%s' "$logical_name"
    return
  fi

  directory_name="\${feature_json%/feature.json}"
  directory_name="\${directory_name##*/}"
  if [[ "$directory_name" =~ ^[0-9]+[_-](.+)$ ]]; then
    printf '%s' "\${BASH_REMATCH[1]}"
    return
  fi

  printf '%s' "$directory_name"
}

if [[ -f .hive/active-feature ]]; then
  active_feature="$(tr -d '\r
' < .hive/active-feature)"
fi

if [[ -n "$active_feature" ]]; then
  resolved_active_feature=''

  for feature_json in .hive/features/*/feature.json; do
    status="$(jq -r '.status // empty' "$feature_json")"
    logical_name="$(logical_name_for_feature "$feature_json")"

    if [[ "$status" != 'completed' && "$logical_name" == "$active_feature" ]]; then
      resolved_active_feature="\${feature_json%/feature.json}"
      resolved_active_feature="\${resolved_active_feature##*/}"
      break
    fi
  done

  active_feature="$resolved_active_feature"
fi

if [[ -z "$active_feature" ]]; then
  for feature_json in .hive/features/*/feature.json; do
    status="$(jq -r '.status // empty' "$feature_json")"

    if [[ "$status" != 'completed' ]]; then
      active_feature="\${feature_json%/feature.json}"
      active_feature="\${active_feature##*/}"
      break
    fi
  done
fi

if [[ -z "$active_feature" ]]; then
  jq -n '{}'
  exit 0
fi

context_dir=".hive/features/$active_feature/context"

if [[ ! -d "$context_dir" ]]; then
  context_dir=".hive/features/$active_feature/contexts"
fi

if [[ ! -d "$context_dir" ]]; then
  jq -n '{}'
  exit 0
fi

combined_context=''

for context_file in "$context_dir"/*; do
  if [[ ! -f "$context_file" ]]; then
    continue
  fi

  file_name="\${context_file##*/}"
  file_content="$(<"$context_file")"

  if [[ -n "$file_content" ]]; then
    if [[ -n "$combined_context" ]]; then
      combined_context+=$'

'
    fi

    combined_context+="## $file_name"
    combined_context+=$'

'
    combined_context+="$file_content"
  fi
done

if [[ -z "$combined_context" ]]; then
  jq -n '{}'
  exit 0
fi

jq -n --arg additionalContext "$combined_context" '{ additionalContext: $additionalContext }'
`);
  return buildHookOutput(
    "hive-context-injection.json",
    {
      version: 1,
      hooks: {
        sessionStart: [
          {
            type: "command",
            command: { bash: ".github/hooks/scripts/inject-context.sh" },
            timeoutSec: 10
          }
        ]
      }
    },
    [
      {
        filename: "inject-context.sh",
        content: script
      }
    ]
  );
}
function generateAllHooks() {
  return [generatePlanEnforcementHook(), generateContextInjectionHook()];
}

// src/generators/instructions.ts
function buildInstructionBody(description, applyTo, content) {
  return `---
description: "${description}"
applyTo: "${applyTo}"
---

${content.trim()}
`;
}
function createInstructionFile(filename, description, applyTo, content) {
  return {
    filename,
    description,
    applyTo,
    body: buildInstructionBody(description, applyTo, content)
  };
}
function generateHiveWorkflowInstructions() {
  return createInstructionFile(
    "hive-workflow.instructions.md",
    "Hive plan-first development workflow",
    "**",
    "This project uses Hive plan-first development. Before making changes, check for an active feature with hive_status. Follow: Plan \u2192 Review \u2192 Approve \u2192 Execute \u2192 Merge. Save research to context files with hive_context_write. Never execute code without an approved plan."
  );
}
function generateCodingStandardsTemplate() {
  return createInstructionFile(
    "coding-standards.instructions.md",
    "Project coding standards template",
    "**/*.ts",
    `## Imports

<!-- TODO: customize -->
- Prefer explicit imports and keep local import style consistent.

## Naming

<!-- TODO: customize -->
- Document naming conventions for files, types, functions, and constants.

## Error Handling

<!-- TODO: customize -->
- Define how errors should be surfaced, wrapped, or logged.

## Testing

<!-- TODO: customize -->
- Describe required test coverage, frameworks, and verification expectations.`
  );
}
function generateAllInstructions() {
  return [generateHiveWorkflowInstructions(), generateCodingStandardsTemplate()];
}

// src/generators/plugin.ts
var pluginManifestTemplate = {
  name: "agent-hive",
  description: "Plan-first AI development with isolated worktrees and human review",
  author: { name: "tctinh" },
  repository: "https://github.com/tctinh/agent-hive",
  license: "MIT",
  keywords: ["planning", "orchestration", "multi-agent", "worktree", "hive"],
  agents: [".github/agents"],
  skills: [".github/skills/*"],
  hooks: [".github/hooks/*"],
  instructions: [".github/instructions"]
};
function generatePluginManifest(options = {}) {
  return {
    ...pluginManifestTemplate,
    version: options.version ?? "1.0.0",
    author: { ...pluginManifestTemplate.author },
    keywords: [...pluginManifestTemplate.keywords],
    agents: [...pluginManifestTemplate.agents],
    skills: [...pluginManifestTemplate.skills],
    hooks: [...pluginManifestTemplate.hooks],
    instructions: [...pluginManifestTemplate.instructions]
  };
}

// src/generators/skills.ts
var MAX_SKILL_NAME_LENGTH = 64;
var MIN_SKILL_DESCRIPTION_LENGTH = 10;
var MAX_SKILL_DESCRIPTION_LENGTH = 1024;
var MAX_SKILL_CONTENT_LENGTH = 3e4;
function ensureSkillName(name) {
  const trimmed2 = name.trim();
  if (trimmed2.length === 0 || trimmed2.length > MAX_SKILL_NAME_LENGTH) {
    throw new Error(`Skill name must be between 1 and ${MAX_SKILL_NAME_LENGTH} characters.`);
  }
  return trimmed2;
}
function ensureSkillDescription(description) {
  const trimmed2 = description.trim();
  if (trimmed2.length < MIN_SKILL_DESCRIPTION_LENGTH || trimmed2.length > MAX_SKILL_DESCRIPTION_LENGTH) {
    throw new Error(
      `Skill description must be between ${MIN_SKILL_DESCRIPTION_LENGTH} and ${MAX_SKILL_DESCRIPTION_LENGTH} characters.`
    );
  }
  return trimmed2;
}
function stripFrontmatter(content) {
  const normalized = content.trim();
  if (!normalized.startsWith("---\n")) {
    return normalized;
  }
  const endIndex = normalized.indexOf("\n---\n", 4);
  if (endIndex === -1) {
    return normalized;
  }
  return normalized.slice(endIndex + 5).trim();
}
function buildFrontmatter(name, description) {
  return `---
name: ${name}
description: ${description}
---`;
}
function assertSkillContentLength(content) {
  if (content.length > MAX_SKILL_CONTENT_LENGTH) {
    throw new Error(`Skill content must be at most ${MAX_SKILL_CONTENT_LENGTH} characters.`);
  }
  return content;
}
function generateSkillFile(skill) {
  const name = ensureSkillName(skill.name);
  const description = ensureSkillDescription(skill.description);
  const body = stripFrontmatter(skill.content);
  const content = `${buildFrontmatter(name, description)}

${body}
`;
  return assertSkillContentLength(content);
}
var builtinSkillSources = [
  {
    name: "writing-plans",
    description: "Use when you have a spec or requirements for a multi-step task, before touching code",
    body: `# Writing Plans

## Overview

Write comprehensive implementation plans assuming the engineer has zero context for our codebase and questionable taste. Document everything they need to know: which files to touch for each task, code, testing, docs they might need to check, how to test it. Give them the whole plan as bite-sized tasks. DRY. YAGNI. TDD. Frequent commits.

Assume they are a skilled developer, but know almost nothing about our toolset or problem domain. Assume they don't know good test design very well.

**Announce at start:** "I'm using the writing-plans skill to create the implementation plan."

**Context:** Planning is read-only. Use \`hive_feature_create\` + \`hive_plan_write\` and avoid worktrees during planning.

**Save plans to:** \`hive_plan_write\` (writes to \`.hive/features/<feature>/plan.md\`)

## Bite-Sized Task Granularity

**Each step is one action (2-5 minutes):**
- "Write the failing test" - step
- "Run it to make sure it fails" - step
- "Implement the minimal code to make the test pass" - step
- "Run the tests and make sure they pass" - step
- "Commit" - step

## Plan Structure

**Every plan MUST follow this structure:**

\`\`\`\`markdown
# [Feature Name]

## Discovery

### Original Request
- "{User's exact words}"

### Interview Summary
- {Point}: {Decision}

### Research Findings
- \`{file:lines}\`: {Finding}

---

## Non-Goals (What we're NOT building)
- {Explicit exclusion}

---

## Tasks

### 1. Task Name

Use the Task Structure template below for every task.
\`\`\`\`


## Task Structure

The **Depends on** annotation declares task execution order:
- **Depends on**: none \u2014 No dependencies; can run immediately or in parallel
- **Depends on**: 1 \u2014 Depends on task 1
- **Depends on**: 1, 3 \u2014 Depends on tasks 1 and 3

Always include **Depends on** for each task. Use \`none\` to enable parallel starts.

\`\`\`\`markdown
### N. Task Name

**Depends on**: none

**Files:**
- Create: \`exact/path/to/file.py\`
- Modify: \`exact/path/to/existing.py:123-145\`
- Test: \`tests/exact/path/to/test.py\`

**What to do**:
- Step 1: Write the failing test
  \`\`\`python
  def test_specific_behavior():
      result = function(input)
      assert result == expected
  \`\`\`
- Step 2: Run test to verify it fails
  - Run: \`pytest tests/path/test.py::test_name -v\`
  - Expected: FAIL with "function not defined"
- Step 3: Write minimal implementation
  \`\`\`python
  def function(input):
      return expected
  \`\`\`
- Step 4: Run test to verify it passes
  - Run: \`pytest tests/path/test.py::test_name -v\`
  - Expected: PASS
- Step 5: Commit
  \`\`\`bash
  git add tests/path/test.py src/path/file.py
  git commit -m "feat: add specific feature"
  \`\`\`

**Must NOT do**:
- {Task guardrail}

**References**:
- \`{file:lines}\` \u2014 {Why this reference matters}

**Verify**:
- [ ] Run: \`{command}\` \u2192 {expected}
- [ ] {Additional acceptance criteria}

All verification MUST be agent-executable (no human intervention):
\u2705 \`bun test\` \u2192 all pass
\u2705 \`curl -X POST /api/x\` \u2192 201
\u274C "User manually tests..."
\u274C "Visually confirm..."
\`\`\`\`

## Remember
- Exact file paths always
- Complete code in plan (not "add validation")
- Exact commands with expected output
- Reference relevant skills with @ syntax
- DRY, YAGNI, TDD, frequent commits
- All acceptance criteria must be agent-executable (zero human intervention)

## Execution Handoff

After saving the plan, ask whether to consult Hygienic (Consultant/Reviewer/Debugger) before offering execution choice.

Plan complete and saved to \`.hive/features/<feature>/plan.md\`.

Two execution options:
1. Agent-Driven (this session) - I dispatch fresh subagent per task, review between tasks, fast iteration
2. Parallel Session (separate) - Open new session with executing-plans, batch execution with checkpoints

Which approach?

**If Agent-Driven chosen:**
- Stay in this session
- Fresh subagent per task + code review

**If Parallel Session chosen:**
- Guide them to open new session in worktree
- **REQUIRED SUB-SKILL:** New session uses Refer to the skill at .github/skills/executing-plans/SKILL.md
`
  },
  {
    name: "executing-plans",
    description: "Use when you have a written implementation plan to execute in a separate session with review checkpoints",
    body: `# Executing Plans

## Overview

Load plan, review critically, execute tasks in batches, report for review between batches.

**Core principle:** Batch execution with checkpoints for architect review.

**Announce at start:** "I'm using the executing-plans skill to implement this plan."

## The Process

### Step 1: Load and Review Plan
1. Read plan file
2. Review critically - identify any questions or concerns about the plan
3. If concerns: Raise them with your human partner before starting
4. If no concerns: Create a short checklist in your working notes and proceed

### Step 2: Identify Runnable Tasks

Use \`hive_status()\` to get the **runnable** list \u2014 tasks with all dependencies satisfied.

Only \`done\` satisfies dependencies (not \`blocked\`, \`failed\`, \`partial\`, \`cancelled\`).

**When 2+ tasks are runnable:**
- Ask the user directly in chat: "Multiple tasks are runnable: [list]. Run in parallel, sequential, or a specific subset?"
- Record the decision with \`hive_context_write({ name: "execution-decisions", content: "..." })\` for future reference

**When 1 task is runnable:** Proceed directly.

### Step 3: Execute Batch

For each task in the batch:
1. Mark as in_progress via \`hive_worktree_start()\`
2. Follow each step exactly (plan has bite-sized steps)
3. Run verifications as specified
4. Mark as completed

### Step 4: Report
When batch complete:
- Show what was implemented
- Show verification output
- Say: "Ready for feedback."

### Step 4.5: Post-Batch Hygienic Review

After the batch report, ask the user directly in chat if they want a Hygienic code review for the batch.
If yes, invoke the @hygienic agent via the agent tool to review implementation changes from the latest batch, then apply feedback before starting the next batch.

### Step 5: Continue
Based on feedback:
- Apply changes if needed
- Execute next batch
- Repeat until complete

### Step 6: Complete Development

After all tasks complete and verified:
- Announce: "I'm using the verification-before-completion skill to complete this work."
- **REQUIRED SUB-SKILL:** Refer to the skill at .github/skills/verification-before-completion/SKILL.md
- Follow that skill to verify tests, present options, execute choice

## When to Stop and Ask for Help

**STOP executing immediately when:**
- Hit a blocker mid-batch (missing dependency, test fails, instruction unclear)
- Plan has critical gaps preventing starting
- You don't understand an instruction
- Verification fails repeatedly

**Ask for clarification rather than guessing.**

## When to Revisit Earlier Steps

**Return to Review (Step 1) when:**
- Partner updates the plan based on your feedback
- Fundamental approach needs rethinking

**Don't force through blockers** - stop and ask.

## Remember
- Review plan critically first
- Follow plan steps exactly
- Don't skip verifications
- Reference skills when plan says to
- Between batches: just report and wait
- Stop when blocked, don't guess
`
  },
  {
    name: "brainstorming",
    description: "Use before any creative work - creating features, building components, adding functionality, or modifying behavior. Explores user intent, requirements and design before implementation.",
    body: `# Brainstorming Ideas Into Designs

## Overview

Help turn ideas into fully formed designs and specs through natural collaborative dialogue.

Start by understanding the current project context, then ask questions one at a time to refine the idea. Once you understand what you're building, present the design in small sections (200-300 words), checking after each section whether it looks right so far.

## The Process

**Understanding the idea:**
- Check out the current project state first (files, docs, recent commits)
- Ask questions one at a time to refine the idea
- Prefer multiple choice questions when possible, but open-ended is fine too
- Only one question per message - if a topic needs more exploration, break it into multiple questions
- Focus on understanding: purpose, constraints, success criteria

**Exploring approaches:**
- Propose 2-3 different approaches with trade-offs
- Present options conversationally with your recommendation and reasoning
- Lead with your recommended option and explain why

**Presenting the design:**
- Once you believe you understand what you're building, present the design
- Break it into sections of 200-300 words
- Ask after each section whether it looks right so far
- Cover: architecture, components, data flow, error handling, testing
- Be ready to go back and clarify if something doesn't make sense

## After the Design

**Documentation:**
- Write the validated design to \`docs/plans/YYYY-MM-DD-<topic>-design.md\`
- Commit the design document to git

**Implementation (if continuing):**
- Ask: "Ready to set up for implementation?"
- Refer to the skill at .github/skills/writing-plans/SKILL.md to create a detailed implementation plan

## Key Principles

- **One question at a time** - Don't overwhelm with multiple questions
- **Multiple choice preferred** - Easier to answer than open-ended when possible
- **YAGNI ruthlessly** - Remove unnecessary features from all designs
- **Explore alternatives** - Always propose 2-3 approaches before settling
- **Incremental validation** - Present design in sections, validate each
- **Be flexible** - Go back and clarify when something doesn't make sense
- **Challenge assumptions** - Surface fragile assumptions, ask what changes if they fail, offer lean fallback options
`
  },
  {
    name: "parallel-exploration",
    description: "Use when you need parallel, read-only exploration with the agent tool (Scout fan-out)",
    body: `# Parallel Exploration (Scout Fan-Out)

## Overview

When you need to answer "where/how does X work?" across multiple domains (codebase, tests, docs, OSS), investigating sequentially wastes time. Each investigation is independent and can happen in parallel.

**Core principle:** Decompose into independent sub-questions, invoke one scout agent per sub-question, and synthesize the results together.

**Safe in Planning mode:** This is read-only exploration. It is OK to use during exploratory research even when there is no feature, no plan, and no approved tasks.

**This skill is for read-only research.** For parallel implementation work, refer to the skill at .github/skills/dispatching-parallel-agents/SKILL.md and use \`hive_worktree_start\`.

## When to Use

**Default to this skill when:**
**Use when:**
- Investigation spans multiple domains (code + tests + docs)
- User asks **2+ questions across different domains** (e.g., code + tests, code + docs/OSS, code + config/runtime)
- Questions are independent (answer to A doesn't affect B)
- User asks **3+ independent questions** (often as a numbered list or separate bullets)
- No edits needed (read-only exploration)
- User asks for an exploration that likely spans multiple files/packages
- The work is read-only and the questions can be investigated independently

**Only skip this skill when:**
- Investigation requires shared state or context between questions
- It's a single focused question that is genuinely answerable with **one quick grep + one file read**
- Questions are dependent (answer A materially changes what to ask for B)
- Work involves file edits (use Hive tasks / Forager instead)

**Important:** Do not treat "this is exploratory" as a reason to avoid delegation. This skill is specifically for exploratory research when fan-out makes it faster and cleaner.

## The Pattern

### 1. Decompose Into Independent Questions

Split your investigation into 2-4 independent sub-questions. Good decomposition:

| Domain | Question Example |
|--------|------------------|
| Codebase | "Where is X implemented? What files define it?" |
| Tests | "How is X tested? What test patterns exist?" |
| Docs/OSS | "How do other projects implement X? What's the recommended pattern?" |
| Config | "How is X configured? What environment variables affect it?" |

**Bad decomposition (dependent questions):**
- "What is X?" then "How is X used?" (second depends on first)
- "Find the bug" then "Fix the bug" (not read-only)

### 2. Invoke Scout Agents in Parallel

Start all independent scout requests before waiting on any result.

\`\`\`text
Invoke the @scout agent via the agent tool for question 1.
Invoke the @scout agent via the agent tool for question 2.
Invoke the @scout agent via the agent tool for question 3.
\`\`\`

**Key points:**
- Invoke the @scout agent via the agent tool for read-only exploration
- Give each invocation a clear, focused scope
- Make prompts specific about what evidence to return

### 3. Continue Working (Optional)

While tasks run, you can:
- Work on other aspects of the problem
- Prepare synthesis structure
- Start drafting based on what you already know

Each scout result returns to the parent chat when it completes.

### 4. Collect Results

When each task completes, its result is returned directly. Collect the outputs from each task and proceed to synthesis.

### 5. Synthesize Findings

Combine results from all tasks:
- Cross-reference findings (file X mentioned by tasks A and B)
- Identify gaps (task C found nothing, need different approach)
- Build coherent answer from parallel evidence

### 6. Cleanup (If Needed)

No manual cancellation is required for these agent invocations.

## Prompt Templates

### Codebase Slice

\`\`\`
Investigate [TOPIC] in the codebase:
- Where is [X] defined/implemented?
- What files contain [X]?
- How does [X] interact with [Y]?

Return:
- File paths with line numbers
- Brief code snippets as evidence
- Key patterns observed
\`\`\`

### Tests Slice

\`\`\`
Investigate how [TOPIC] is tested:
- What test files cover [X]?
- What testing patterns are used?
- What edge cases are tested?

Return:
- Test file paths
- Example test patterns
- Coverage gaps if obvious
\`\`\`

### Docs/OSS Slice

\`\`\`
Research [TOPIC] in external sources:
- How do other projects implement [X]?
- What does the official documentation say?
- What are common patterns/anti-patterns?

Return:
- Links to relevant docs/repos
- Key recommendations
- Patterns that apply to our codebase
\`\`\`

## Real Example

**Investigation:** "How does the API routing system work?"

**Decomposition:**
1. Implementation: Where are API routes defined?
2. Routing: How does route registration work?
3. Notifications: How are errors surfaced to the caller?

**Fan-out:**
\`\`\`text
Invoke the @scout agent via the agent tool to find API route implementation.
Invoke the @scout agent via the agent tool to analyze concurrency.
Invoke the @scout agent via the agent tool to find the notification mechanism.
\`\`\`

**Results:**
- Task 1: Found \`background-tools.ts\` (tool definition), \`index.ts\` (registration)
- Task 2: Found \`manager.ts\` with concurrency=3 default, queue-based scheduling
- Task 3: Found \`session.prompt()\` call in manager for parent notification

**Synthesis:** Complete picture of background task lifecycle in ~1/3 the time of sequential investigation.

## Common Mistakes

**Spawning sequentially (defeats the purpose):**
\`\`\`text
Bad: invoke one scout agent, wait, then decide whether to invoke the next.
\`\`\`

\`\`\`text
Good: issue all independent scout invocations in the same response.
\`\`\`

**Too many tasks (diminishing returns):**
- 2-4 tasks: Good parallelization
- 5+ tasks: Overhead exceeds benefit, harder to synthesize

**Dependent questions:**
- Don't spawn task B if it needs task A's answer
- Either make them independent or run sequentially

**Using for edits:**
- Scout is read-only; use Forager for implementation
- This skill is for exploration, not execution

## Key Benefits

1. **Speed** - 3 investigations in time of 1
2. **Focus** - Each Scout has narrow scope
3. **Independence** - No interference between tasks
4. **Flexibility** - Cancel unneeded tasks, add new ones

## Verification

After using this pattern, verify:
- [ ] All tasks spawned before collecting any results (true fan-out)
- [ ] Verified agent-tool fan-out pattern used for parallel exploration
- [ ] Synthesized findings into coherent answer
`
  },
  {
    name: "dispatching-parallel-agents",
    description: "Use when facing 2+ independent tasks that can be worked on without shared state or sequential dependencies",
    body: `# Dispatching Parallel Agents

## Overview

When you have multiple unrelated failures (different test files, different subsystems, different bugs), investigating them sequentially wastes time. Each investigation is independent and can happen in parallel.

**Core principle:** Dispatch one agent per independent problem domain. Let them work concurrently.

## Prerequisite: Check Runnable Tasks

Before dispatching, use \`hive_status()\` to get the **runnable** list \u2014 tasks whose dependencies are all satisfied.

**Only dispatch tasks that are runnable.** Never start tasks with unmet dependencies.

Only \`done\` satisfies dependencies (not \`blocked\`, \`failed\`, \`partial\`, \`cancelled\`).

**Ask the operator first:**
- Ask the operator directly in chat: "These tasks are runnable and independent: [list]. Execute in parallel?"
- Record the decision with \`hive_context_write({ name: "execution-decisions", content: "..." })\`
- Proceed only after operator approval

## When to Use

\`\`\`dot
digraph when_to_use {
    "Multiple failures?" [shape=diamond];
    "Are they independent?" [shape=diamond];
    "Single agent investigates all" [shape=box];
    "One agent per problem domain" [shape=box];
    "Can they work in parallel?" [shape=diamond];
    "Sequential agents" [shape=box];
    "Parallel dispatch" [shape=box];

    "Multiple failures?" -> "Are they independent?" [label="yes"];
    "Are they independent?" -> "Single agent investigates all" [label="no - related"];
    "Are they independent?" -> "Can they work in parallel?" [label="yes"];
    "Can they work in parallel?" -> "Parallel dispatch" [label="yes"];
    "Can they work in parallel?" -> "Sequential agents" [label="no - shared state"];
}
\`\`\`

**Use when:**
- 3+ test files failing with different root causes
- Multiple subsystems broken independently
- Each problem can be understood without context from others
- No shared state between investigations

**Don't use when:**
- Failures are related (fix one might fix others)
- Need to understand full system state
- Agents would interfere with each other

## The Pattern

### 1. Identify Independent Domains

Group failures by what's broken:
- File A tests: Tool approval flow
- File B tests: Batch completion behavior
- File C tests: Abort functionality

Each domain is independent - fixing tool approval doesn't affect abort tests.

### 2. Create Focused Agent Tasks

Each agent gets:
- **Specific scope:** One test file or subsystem
- **Clear goal:** Make these tests pass
- **Constraints:** Don't change other code
- **Expected output:** Summary of what you found and fixed

### 3. Dispatch in Parallel

\`\`\`typescript
// Using Hive tools for parallel execution
hive_worktree_start({ task: "01-fix-abort-tests" })
hive_worktree_start({ task: "02-fix-batch-tests" })
hive_worktree_start({ task: "03-fix-race-condition-tests" })
// All three run concurrently in isolated worktrees
\`\`\`

Parallelize by issuing multiple agent-tool invocations in the same response.

\`\`\`text
Invoke the appropriate agent for failure A.
Invoke the appropriate agent for failure B.
\`\`\`

### 4. Review and Integrate

When agents return:
- Read each summary
- Verify fixes don't conflict
- Run full test suite
- Integrate all changes with \`hive_merge\`

## Agent Prompt Structure

Good agent prompts are:
1. **Focused** - One clear problem domain
2. **Self-contained** - All context needed to understand the problem
3. **Specific about output** - What should the agent return?

\`\`\`markdown
Fix the 3 failing tests in src/agents/agent-tool-abort.test.ts:

1. "should abort tool with partial output capture" - expects 'interrupted at' in message
2. "should handle mixed completed and aborted tools" - fast tool aborted instead of completed
3. "should properly track pendingToolCount" - expects 3 results but gets 0

These are timing/race condition issues. Your task:

1. Read the test file and understand what each test verifies
2. Identify root cause - timing issues or actual bugs?
3. Fix by:
   - Replacing arbitrary timeouts with event-based waiting
   - Fixing bugs in abort implementation if found
   - Adjusting test expectations if testing changed behavior

Do NOT just increase timeouts - find the real issue.

Return: Summary of what you found and what you fixed.
\`\`\`

## Common Mistakes

**\u274C Too broad:** "Fix all the tests" - agent gets lost
**\u2705 Specific:** "Fix agent-tool-abort.test.ts" - focused scope

**\u274C No context:** "Fix the race condition" - agent doesn't know where
**\u2705 Context:** Paste the error messages and test names

**\u274C No constraints:** Agent might refactor everything
**\u2705 Constraints:** "Do NOT change production code" or "Fix tests only"

**\u274C Vague output:** "Fix it" - you don't know what changed
**\u2705 Specific:** "Return summary of root cause and changes"

## When NOT to Use

**Related failures:** Fixing one might fix others - investigate together first
**Need full context:** Understanding requires seeing entire system
**Exploratory debugging:** You don't know what's broken yet
**Shared state:** Agents would interfere (editing same files, using same resources)

## Real Example from Session

**Scenario:** 6 test failures across 3 files after major refactoring

**Failures:**
- agent-tool-abort.test.ts: 3 failures (timing issues)
- batch-completion-behavior.test.ts: 2 failures (tools not executing)
- tool-approval-race-conditions.test.ts: 1 failure (execution count = 0)

**Decision:** Independent domains - abort logic separate from batch completion separate from race conditions

**Dispatch:**
\`\`\`
Agent 1 \u2192 Fix agent-tool-abort.test.ts
Agent 2 \u2192 Fix batch-completion-behavior.test.ts
Agent 3 \u2192 Fix tool-approval-race-conditions.test.ts
\`\`\`

**Results:**
- Agent 1: Replaced timeouts with event-based waiting
- Agent 2: Fixed event structure bug (threadId in wrong place)
- Agent 3: Added wait for async tool execution to complete

**Integration:** All fixes independent, no conflicts, full suite green

**Time saved:** 3 problems solved in parallel vs sequentially

## Key Benefits

1. **Parallelization** - Multiple investigations happen simultaneously
2. **Focus** - Each agent has narrow scope, less context to track
3. **Independence** - Agents don't interfere with each other
4. **Speed** - 3 problems solved in time of 1

## Verification

After agents return:
1. **Review each summary** - Understand what changed
2. **Check for conflicts** - Did agents edit same code?
3. **Run full suite** - Verify all fixes work together
4. **Spot check** - Agents can make systematic errors

## Real-World Impact

From debugging session (2025-10-03):
- 6 failures across 3 files
- 3 agents dispatched in parallel
- All investigations completed concurrently
- All fixes integrated successfully
- Zero conflicts between agent changes
`
  },
  {
    name: "systematic-debugging",
    description: "Use when encountering any bug, test failure, or unexpected behavior, before proposing fixes",
    body: `# Systematic Debugging

## Overview

Random fixes waste time and create new bugs. Quick patches mask underlying issues.

**Core principle:** ALWAYS find root cause before attempting fixes. Symptom fixes are failure.

**Violating the letter of this process is violating the spirit of debugging.**

## The Iron Law

\`\`\`
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST
\`\`\`

If you haven't completed Phase 1, you cannot propose fixes.

## When to Use

Use for ANY technical issue:
- Test failures
- Bugs in production
- Unexpected behavior
- Performance problems
- Build failures
- Integration issues

**Use this ESPECIALLY when:**
- Under time pressure (emergencies make guessing tempting)
- "Just one quick fix" seems obvious
- You've already tried multiple fixes
- Previous fix didn't work
- You don't fully understand the issue

**Don't skip when:**
- Issue seems simple (simple bugs have root causes too)
- You're in a hurry (rushing guarantees rework)
- Manager wants it fixed NOW (systematic is faster than thrashing)

## The Four Phases

You MUST complete each phase before proceeding to the next.

### Phase 1: Root Cause Investigation

**BEFORE attempting ANY fix:**

1. **Read Error Messages Carefully**
   - Don't skip past errors or warnings
   - They often contain the exact solution
   - Read stack traces completely
   - Note line numbers, file paths, error codes

2. **Reproduce Consistently**
   - Can you trigger it reliably?
   - What are the exact steps?
   - Does it happen every time?
   - If not reproducible \u2192 gather more data, don't guess

3. **Check Recent Changes**
   - What changed that could cause this?
   - Git diff, recent commits
   - New dependencies, config changes
   - Environmental differences

4. **Gather Evidence in Multi-Component Systems**

   **WHEN system has multiple components (CI \u2192 build \u2192 signing, API \u2192 service \u2192 database):**

   **BEFORE proposing fixes, add diagnostic instrumentation:**
   \`\`\`
   For EACH component boundary:
     - Log what data enters component
     - Log what data exits component
     - Verify environment/config propagation
     - Check state at each layer

   Run once to gather evidence showing WHERE it breaks
   THEN analyze evidence to identify failing component
   THEN investigate that specific component
   \`\`\`

   **Example (multi-layer system):**
   \`\`\`bash
   # Layer 1: Workflow
   echo "=== Secrets available in workflow: ==="
   echo "IDENTITY: \${IDENTITY:+SET}\${IDENTITY:-UNSET}"

   # Layer 2: Build script
   echo "=== Env vars in build script: ==="
   env | grep IDENTITY || echo "IDENTITY not in environment"

   # Layer 3: Signing script
   echo "=== Keychain state: ==="
   security list-keychains
   security find-identity -v

   # Layer 4: Actual signing
   codesign --sign "$IDENTITY" --verbose=4 "$APP"
   \`\`\`

   **This reveals:** Which layer fails (secrets \u2192 workflow \u2713, workflow \u2192 build \u2717)

5. **Trace Data Flow**

   **WHEN error is deep in call stack:**

   See \`root-cause-tracing.md\` in this directory for the complete backward tracing technique.

   **Quick version:**
   - Where does bad value originate?
   - What called this with bad value?
   - Keep tracing up until you find the source
   - Fix at source, not at symptom

### Phase 2: Pattern Analysis

**Find the pattern before fixing:**

1. **Find Working Examples**
   - Locate similar working code in same codebase
   - What works that's similar to what's broken?

2. **Compare Against References**
   - If implementing pattern, read reference implementation COMPLETELY
   - Don't skim - read every line
   - Understand the pattern fully before applying

3. **Identify Differences**
   - What's different between working and broken?
   - List every difference, however small
   - Don't assume "that can't matter"

4. **Understand Dependencies**
   - What other components does this need?
   - What settings, config, environment?
   - What assumptions does it make?

### Phase 3: Hypothesis and Testing

**Scientific method:**

1. **Form Single Hypothesis**
   - State clearly: "I think X is the root cause because Y"
   - Write it down
   - Be specific, not vague

2. **Test Minimally**
   - Make the SMALLEST possible change to test hypothesis
   - One variable at a time
   - Don't fix multiple things at once

3. **Verify Before Continuing**
   - Did it work? Yes \u2192 Phase 4
   - Didn't work? Form NEW hypothesis
   - DON'T add more fixes on top

4. **When You Don't Know**
   - Say "I don't understand X"
   - Don't pretend to know
   - Ask for help
   - Research more

### Phase 4: Implementation

**Fix the root cause, not the symptom:**

1. **Create Failing Test Case**
   - Simplest possible reproduction
   - Automated test if possible
   - One-off test script if no framework
   - MUST have before fixing
   - Refer to the skill at .github/skills/test-driven-development/SKILL.md for writing proper failing tests

2. **Implement Single Fix**
   - Address the root cause identified
   - ONE change at a time
   - No "while I'm here" improvements
   - No bundled refactoring

3. **Verify Fix**
   - Test passes now?
   - No other tests broken?
   - Issue actually resolved?

4. **If Fix Doesn't Work**
   - STOP
   - Count: How many fixes have you tried?
   - If < 3: Return to Phase 1, re-analyze with new information
   - **If \u2265 3: STOP and question the architecture (step 5 below)**
   - DON'T attempt Fix #4 without architectural discussion

5. **If 3+ Fixes Failed: Question Architecture**

   **Pattern indicating architectural problem:**
   - Each fix reveals new shared state/coupling/problem in different place
   - Fixes require "massive refactoring" to implement
   - Each fix creates new symptoms elsewhere

   **STOP and question fundamentals:**
   - Is this pattern fundamentally sound?
   - Are we "sticking with it through sheer inertia"?
   - Should we refactor architecture vs. continue fixing symptoms?

   **Discuss with your human partner before attempting more fixes**

   This is NOT a failed hypothesis - this is a wrong architecture.

## Red Flags - STOP and Follow Process

If you catch yourself thinking:
- "Quick fix for now, investigate later"
- "Just try changing X and see if it works"
- "Add multiple changes, run tests"
- "Skip the test, I'll manually verify"
- "It's probably X, let me fix that"
- "I don't fully understand but this might work"
- "Pattern says X but I'll adapt it differently"
- "Here are the main problems: [lists fixes without investigation]"
- Proposing solutions before tracing data flow
- **"One more fix attempt" (when already tried 2+)**
- **Each fix reveals new problem in different place**

**ALL of these mean: STOP. Return to Phase 1.**

**If 3+ fixes failed:** Question the architecture (see Phase 4.5)

## your human partner's Signals You're Doing It Wrong

**Watch for these redirections:**
- "Is that not happening?" - You assumed without verifying
- "Will it show us...?" - You should have added evidence gathering
- "Stop guessing" - You're proposing fixes without understanding
- "Ultrathink this" - Question fundamentals, not just symptoms
- "We're stuck?" (frustrated) - Your approach isn't working

**When you see these:** STOP. Return to Phase 1.

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "Issue is simple, don't need process" | Simple issues have root causes too. Process is fast for simple bugs. |
| "Emergency, no time for process" | Systematic debugging is FASTER than guess-and-check thrashing. |
| "Just try this first, then investigate" | First fix sets the pattern. Do it right from the start. |
| "I'll write test after confirming fix works" | Untested fixes don't stick. Test first proves it. |
| "Multiple fixes at once saves time" | Can't isolate what worked. Causes new bugs. |
| "Reference too long, I'll adapt the pattern" | Partial understanding guarantees bugs. Read it completely. |
| "I see the problem, let me fix it" | Seeing symptoms \u2260 understanding root cause. |
| "One more fix attempt" (after 2+ failures) | 3+ failures = architectural problem. Question pattern, don't fix again. |

## Quick Reference

| Phase | Key Activities | Success Criteria |
|-------|---------------|------------------|
| **1. Root Cause** | Read errors, reproduce, check changes, gather evidence | Understand WHAT and WHY |
| **2. Pattern** | Find working examples, compare | Identify differences |
| **3. Hypothesis** | Form theory, test minimally | Confirmed or new hypothesis |
| **4. Implementation** | Create test, fix, verify | Bug resolved, tests pass |

## When Process Reveals "No Root Cause"

If systematic investigation reveals issue is truly environmental, timing-dependent, or external:

1. You've completed the process
2. Document what you investigated
3. Implement appropriate handling (retry, timeout, error message)
4. Add monitoring/logging for future investigation

**But:** 95% of "no root cause" cases are incomplete investigation.

## Supporting Techniques

These techniques are part of systematic debugging and available in this directory:

- **\`root-cause-tracing.md\`** - Trace bugs backward through call stack to find original trigger
- **\`defense-in-depth.md\`** - Add validation at multiple layers after finding root cause
- **\`condition-based-waiting.md\`** - Replace arbitrary timeouts with condition polling

**Related skills:**
- **Refer to the skill at .github/skills/test-driven-development/SKILL.md** - For creating a failing test case (Phase 4, Step 1)
- **Refer to the skill at .github/skills/verification-before-completion/SKILL.md** - Verify the fix worked before claiming success

## Real-World Impact

From debugging sessions:
- Systematic approach: 15-30 minutes to fix
- Random fixes approach: 2-3 hours of thrashing
- First-time fix rate: 95% vs 40%
- New bugs introduced: Near zero vs common
`
  },
  {
    name: "test-driven-development",
    description: "Use when implementing any feature or bugfix, before writing implementation code",
    body: `# Test-Driven Development (TDD)

## Overview

Write the test first. Watch it fail. Write minimal code to pass.

**Core principle:** If you didn't watch the test fail, you don't know if it tests the right thing.

**Violating the letter of the rules is violating the spirit of the rules.**

## When to Use

**Always:**
- New features
- Bug fixes
- Refactoring
- Behavior changes

**Exceptions (ask your human partner):**
- Throwaway prototypes
- Generated code
- Configuration files

Thinking "skip TDD just this once"? Stop. That's rationalization.

## The Iron Law

\`\`\`
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
\`\`\`

Write code before the test? Delete it. Start over.

**No exceptions:**
- Don't keep it as "reference"
- Don't "adapt" it while writing tests
- Don't look at it
- Delete means delete

Implement fresh from tests. Period.

## Red-Green-Refactor

\`\`\`dot
digraph tdd_cycle {
    rankdir=LR;
    red [label="RED\\nWrite failing test", shape=box, style=filled, fillcolor="#ffcccc"];
    verify_red [label="Verify fails\\ncorrectly", shape=diamond];
    green [label="GREEN\\nMinimal code", shape=box, style=filled, fillcolor="#ccffcc"];
    verify_green [label="Verify passes\\nAll green", shape=diamond];
    refactor [label="REFACTOR\\nClean up", shape=box, style=filled, fillcolor="#ccccff"];
    next [label="Next", shape=ellipse];

    red -> verify_red;
    verify_red -> green [label="yes"];
    verify_red -> red [label="wrong\\nfailure"];
    green -> verify_green;
    verify_green -> refactor [label="yes"];
    verify_green -> green [label="no"];
    refactor -> verify_green [label="stay\\ngreen"];
    verify_green -> next;
    next -> red;
}
\`\`\`

### RED - Write Failing Test

Write one minimal test showing what should happen.

<Good>
\`\`\`typescript
test('retries failed operations 3 times', async () => {
  let attempts = 0;
  const operation = () => {
    attempts++;
    if (attempts < 3) throw new Error('fail');
    return 'success';
  };

  const result = await retryOperation(operation);

  expect(result).toBe('success');
  expect(attempts).toBe(3);
});
\`\`\`
Clear name, tests real behavior, one thing
</Good>

<Bad>
\`\`\`typescript
test('retry works', async () => {
  const mock = jest.fn()
    .mockRejectedValueOnce(new Error())
    .mockRejectedValueOnce(new Error())
    .mockResolvedValueOnce('success');
  await retryOperation(mock);
  expect(mock).toHaveBeenCalledTimes(3);
});
\`\`\`
Vague name, tests mock not code
</Bad>

**Requirements:**
- One behavior
- Clear name
- Real code (no mocks unless unavoidable)

### Verify RED - Watch It Fail

**MANDATORY. Never skip.**

\`\`\`bash
npm test path/to/test.test.ts
\`\`\`

Confirm:
- Test fails (not errors)
- Failure message is expected
- Fails because feature missing (not typos)

**Test passes?** You're testing existing behavior. Fix test.

**Test errors?** Fix error, re-run until it fails correctly.

### GREEN - Minimal Code

Write simplest code to pass the test.

<Good>
\`\`\`typescript
async function retryOperation<T>(fn: () => Promise<T>): Promise<T> {
  for (let i = 0; i < 3; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i === 2) throw e;
    }
  }
  throw new Error('unreachable');
}
\`\`\`
Just enough to pass
</Good>

<Bad>
\`\`\`typescript
async function retryOperation<T>(
  fn: () => Promise<T>,
  options?: {
    maxRetries?: number;
    backoff?: 'linear' | 'exponential';
    onRetry?: (attempt: number) => void;
  }
): Promise<T> {
  // YAGNI
}
\`\`\`
Over-engineered
</Bad>

Don't add features, refactor other code, or "improve" beyond the test.

### Verify GREEN - Watch It Pass

**MANDATORY.**

\`\`\`bash
npm test path/to/test.test.ts
\`\`\`

Confirm:
- Test passes
- Other tests still pass
- Output pristine (no errors, warnings)

**Test fails?** Fix code, not test.

**Other tests fail?** Fix now.

### REFACTOR - Clean Up

After green only:
- Remove duplication
- Improve names
- Extract helpers

Keep tests green. Don't add behavior.

### Repeat

Next failing test for next feature.

## Good Tests

| Quality | Good | Bad |
|---------|------|-----|
| **Minimal** | One thing. "and" in name? Split it. | \`test('validates email and domain and whitespace')\` |
| **Clear** | Name describes behavior | \`test('test1')\` |
| **Shows intent** | Demonstrates desired API | Obscures what code should do |

## Why Order Matters

**"I'll write tests after to verify it works"**

Tests written after code pass immediately. Passing immediately proves nothing:
- Might test wrong thing
- Might test implementation, not behavior
- Might miss edge cases you forgot
- You never saw it catch the bug

Test-first forces you to see the test fail, proving it actually tests something.

**"I already manually tested all the edge cases"**

Manual testing is ad-hoc. You think you tested everything but:
- No record of what you tested
- Can't re-run when code changes
- Easy to forget cases under pressure
- "It worked when I tried it" \u2260 comprehensive

Automated tests are systematic. They run the same way every time.

**"Deleting X hours of work is wasteful"**

Sunk cost fallacy. The time is already gone. Your choice now:
- Delete and rewrite with TDD (X more hours, high confidence)
- Keep it and add tests after (30 min, low confidence, likely bugs)

The "waste" is keeping code you can't trust. Working code without real tests is technical debt.

**"TDD is dogmatic, being pragmatic means adapting"**

TDD IS pragmatic:
- Finds bugs before commit (faster than debugging after)
- Prevents regressions (tests catch breaks immediately)
- Documents behavior (tests show how to use code)
- Enables refactoring (change freely, tests catch breaks)

"Pragmatic" shortcuts = debugging in production = slower.

**"Tests after achieve the same goals - it's spirit not ritual"**

No. Tests-after answer "What does this do?" Tests-first answer "What should this do?"

Tests-after are biased by your implementation. You test what you built, not what's required. You verify remembered edge cases, not discovered ones.

Tests-first force edge case discovery before implementing. Tests-after verify you remembered everything (you didn't).

30 minutes of tests after \u2260 TDD. You get coverage, lose proof tests work.

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "Too simple to test" | Simple code breaks. Test takes 30 seconds. |
| "I'll test after" | Tests passing immediately prove nothing. |
| "Tests after achieve same goals" | Tests-after = "what does this do?" Tests-first = "what should this do?" |
| "Already manually tested" | Ad-hoc \u2260 systematic. No record, can't re-run. |
| "Deleting X hours is wasteful" | Sunk cost fallacy. Keeping unverified code is technical debt. |
| "Keep as reference, write tests first" | You'll adapt it. That's testing after. Delete means delete. |
| "Need to explore first" | Fine. Throw away exploration, start with TDD. |
| "Test hard = design unclear" | Listen to test. Hard to test = hard to use. |
| "TDD will slow me down" | TDD faster than debugging. Pragmatic = test-first. |
| "Manual test faster" | Manual doesn't prove edge cases. You'll re-test every change. |
| "Existing code has no tests" | You're improving it. Add tests for existing code. |

## Red Flags - STOP and Start Over

- Code before test
- Test after implementation
- Test passes immediately
- Can't explain why test failed
- Tests added "later"
- Rationalizing "just this once"
- "I already manually tested it"
- "Tests after achieve the same purpose"
- "It's about spirit not ritual"
- "Keep as reference" or "adapt existing code"
- "Already spent X hours, deleting is wasteful"
- "TDD is dogmatic, I'm being pragmatic"
- "This is different because..."

**All of these mean: Delete code. Start over with TDD.**

## Example: Bug Fix

**Bug:** Empty email accepted

**RED**
\`\`\`typescript
test('rejects empty email', async () => {
  const result = await submitForm({ email: '' });
  expect(result.error).toBe('Email required');
});
\`\`\`

**Verify RED**
\`\`\`bash
$ npm test
FAIL: expected 'Email required', got undefined
\`\`\`

**GREEN**
\`\`\`typescript
function submitForm(data: FormData) {
  if (!data.email?.trim()) {
    return { error: 'Email required' };
  }
  // ...
}
\`\`\`

**Verify GREEN**
\`\`\`bash
$ npm test
PASS
\`\`\`

**REFACTOR**
Extract validation for multiple fields if needed.

## Verification Checklist

Before marking work complete:

- [ ] Every new function/method has a test
- [ ] Watched each test fail before implementing
- [ ] Each test failed for expected reason (feature missing, not typo)
- [ ] Wrote minimal code to pass each test
- [ ] All tests pass
- [ ] Output pristine (no errors, warnings)
- [ ] Tests use real code (mocks only if unavoidable)
- [ ] Edge cases and errors covered

Can't check all boxes? You skipped TDD. Start over.

## When Stuck

| Problem | Solution |
|---------|----------|
| Don't know how to test | Write wished-for API. Write assertion first. Ask your human partner. |
| Test too complicated | Design too complicated. Simplify interface. |
| Must mock everything | Code too coupled. Use dependency injection. |
| Test setup huge | Extract helpers. Still complex? Simplify design. |

## Debugging Integration

Bug found? Write failing test reproducing it. Follow TDD cycle. Test proves fix and prevents regression.

Never fix bugs without a test.

## Testing Anti-Patterns

When adding mocks or test utilities, avoid common pitfalls:
- Testing mock behavior instead of real behavior
- Adding test-only methods to production classes
- Mocking without understanding dependencies

## Final Rule

\`\`\`
Production code \u2192 test exists and failed first
Otherwise \u2192 not TDD
\`\`\`

No exceptions without your human partner's permission.
`
  },
  {
    name: "code-reviewer",
    description: "Use when reviewing implementation changes against an approved plan or task (especially before merging or between Hive tasks) to catch missing requirements, YAGNI, dead code, and risky patterns",
    body: `# Code Reviewer

## Overview

This skill teaches a reviewer to evaluate implementation changes for:
- Adherence to the approved plan/task (did we build what we said?)
- Correctness (does it work, including edge cases?)
- Simplicity (YAGNI, dead code, over-abstraction)
- Risk (security, performance, maintainability)

**Core principle:** The best change is the smallest correct change that satisfies the plan.

## Iron Laws

- Review against the task/plan first. Code quality comes second.
- Bias toward deletion and simplification. Every extra line is a liability.
- Prefer changes that leverage existing patterns and dependencies.
- Be specific: cite file paths and (when available) line numbers.
- Do not invent requirements. If the plan/task is ambiguous, mark it and request clarification.

## What Inputs You Need

Minimum:
- The task intent (1-3 sentences)
- The plan/task requirements (or a link/path to plan section)
- The code changes (diff or list of changed files)

If available (recommended):
- Acceptance criteria / verification steps from the plan
- Test output or proof the change was verified
- Any relevant context files (design decisions, constraints)

## Review Process (In Order)

### 1) Identify Scope

1. List all files changed.
2. For each file, state why it changed (what requirement it serves).
3. Flag any changes that do not map to the task/plan.

**Rule:** If you cannot map a change to a requirement, treat it as suspicious until justified.

### 2) Plan/Task Adherence (Non-Negotiable)

Create a simple checklist:
- What the task says must happen
- Evidence in code/tests that it happens

Flag as issues:
- Missing requirements (implemented behavior does not match intent)
- Partial implementation with no follow-up task (TODO-driven shipping)
- Behavior changes that are not in the plan/task

### 3) Correctness Layer

Review for:
- Edge cases and error paths
- Incorrect assumptions about inputs/types
- Inconsistent behavior across platforms/environments
- Broken invariants (e.g., state can become invalid)

Prefer "fail fast, fail loud": invalid states should become clear errors, not silent fallbacks.

### 4) Simplicity / YAGNI Layer

Be ruthless and concrete:
- Remove dead branches, unused flags/options, unreachable code
- Remove speculative TODOs and "reserved for future" scaffolding
- Remove comments that restate the code or narrate obvious steps
- Inline one-off abstractions (helpers/classes/interfaces used once)
- Replace cleverness with obvious code
- Reduce nesting with guard clauses / early returns

Prefer clarity over brevity:
- Avoid nested ternary operators; use \`if/else\` or \`switch\` when branches matter
- Avoid dense one-liners that hide intent or make debugging harder

### 4b) De-Slop Pass (AI Artifacts / Style Drift)

Scan the diff (not just the final code) for AI-generated slop introduced in this branch:
- Extra comments that a human would not add, or that do not match the file's tone
- Defensive checks or try/catch blocks that are abnormal for that area of the codebase
  - Especially swallowed errors ("ignore and continue") and silent fallbacks
  - Especially redundant validation in trusted internal codepaths
- TypeScript escape hatches used to dodge type errors (\`as any\`, \`as unknown as X\`) without necessity
- Style drift: naming, error handling patterns, logging style, and structure inconsistent with nearby code

Default stance:
- Prefer deletion over justification.
- If validation is needed, do it at boundaries; keep internals trusting parsed inputs.
- If a cast is truly unavoidable, localize it and keep the justification to a single short note.

When recommending simplifications, do not accidentally change behavior. If the current behavior is unclear, request clarification or ask for a test that pins it down.

**Default stance:** Do not add extensibility points without an explicit current requirement.

### 5) Risk Layer (Security / Performance / Maintainability)

Only report what you are confident about.

Security checks (examples):
- No secrets in code/logs
- No injection vectors (shell/SQL/HTML) introduced
- Authz/authn checks preserved
- Sensitive data not leaked

Performance checks (examples):
- Avoid unnecessary repeated work (N+1 queries, repeated parsing, repeated filesystem hits)
- Avoid obvious hot-path allocations or large sync operations

Maintainability checks:
- Clear naming and intent
- Consistent error handling
- API boundaries not blurred
- Consistent with local file patterns (imports, export style, function style)

### 6) Make One Primary Recommendation

Provide one clear path to reach approval.
Mention alternatives only when they have materially different trade-offs.

### 7) Signal the Investment

Tag the required follow-up effort using:
- Quick (<1h)
- Short (1-4h)
- Medium (1-2d)
- Large (3d+)

## Confidence Filter

Only report findings you believe are >=80% likely to be correct.
If you are unsure, explicitly label it as "Uncertain" and explain what evidence would confirm it.

## Output Format (Use This Exactly)

---

**Files Reviewed:** [list]

**Plan/Task Reference:** [task name + link/path to plan section if known]

**Overall Assessment:** [APPROVE | REQUEST_CHANGES | NEEDS_DISCUSSION]

**Bottom Line:** 2-3 sentences describing whether it matches the task/plan and what must change.

### Critical Issues
- None | [file:line] - [issue] (why it blocks approval) + (recommended fix)

### Major Issues
- None | [file:line] - [issue] + (recommended fix)

### Minor Issues
- None | [file:line] - [issue] + (suggested fix)

### YAGNI / Dead Code
- None | [file:line] - [what to remove/simplify] + (why it is unnecessary)

### Positive Observations
- [at least one concrete good thing]

### Action Plan
1. [highest priority change]
2. [next]
3. [next]

### Effort Estimate
[Quick | Short | Medium | Large]

---

## Common Review Smells (Fast Scan)

Task/plan adherence:
- Adds features not mentioned in the plan/task
- Leaves TODOs as the mechanism for correctness
- Introduces new configuration modes/flags "for future"

YAGNI / dead code:
- Options/config that are parsed but not used
- Branches that do the same thing on both sides
- Comments like "reserved for future" or "we might need this"

AI slop / inconsistency:
- Commentary that restates code, narrates obvious steps, or adds process noise
- try/catch that swallows errors or returns defaults without a requirement
- \`as any\` used to silence type errors instead of fixing types
- New helpers/abstractions with a single call site

Correctness:
- Silent fallbacks to defaults on error when the task expects a hard failure
- Unhandled error paths, missing cleanup, missing returns

Maintainability:
- Abstractions used once
- Unclear naming, "utility" grab-bags

## When to Escalate

Use NEEDS_DISCUSSION (instead of REQUEST_CHANGES) when:
- The plan/task is ambiguous and multiple implementations could be correct
- The change implies a product/architecture decision not documented
- Fixing issues requires changing scope, dependencies, or public API
`
  },
  {
    name: "verification-before-completion",
    description: "Use when about to claim work is complete, fixed, or passing, before committing or creating PRs - requires running verification commands and confirming output before making any success claims; evidence before assertions always",
    body: `# Verification Before Completion

## Overview

Claiming work is complete without verification is dishonesty, not efficiency.

**Core principle:** Evidence before claims, always.

**Violating the letter of this rule is violating the spirit of this rule.**

## The Iron Law

\`\`\`
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
\`\`\`

If you haven't run the verification command in this message, you cannot claim it passes.

## The Gate Function

\`\`\`
BEFORE claiming any status or expressing satisfaction:

1. IDENTIFY: What command proves this claim?
2. RUN: Execute the FULL command (fresh, complete)
3. READ: Full output, check exit code, count failures
4. VERIFY: Does output confirm the claim?
   - If NO: State actual status with evidence
   - If YES: State claim WITH evidence
5. ONLY THEN: Make the claim

Skip any step = lying, not verifying
\`\`\`

## Common Failures

| Claim | Requires | Not Sufficient |
|-------|----------|----------------|
| Tests pass | Test command output: 0 failures | Previous run, "should pass" |
| Linter clean | Linter output: 0 errors | Partial check, extrapolation |
| Build succeeds | Build command: exit 0 | Linter passing, logs look good |
| Bug fixed | Test original symptom: passes | Code changed, assumed fixed |
| Regression test works | Red-green cycle verified | Test passes once |
| Agent completed | VCS diff shows changes | Agent reports "success" |
| Requirements met | Line-by-line checklist | Tests passing |

## Red Flags - STOP

- Using "should", "probably", "seems to"
- Expressing satisfaction before verification ("Great!", "Perfect!", "Done!", etc.)
- About to commit/push/PR without verification
- Trusting agent success reports
- Relying on partial verification
- Thinking "just this once"
- Tired and wanting work over
- **ANY wording implying success without having run verification**

## Rationalization Prevention

| Excuse | Reality |
|--------|---------|
| "Should work now" | RUN the verification |
| "I'm confident" | Confidence \u2260 evidence |
| "Just this once" | No exceptions |
| "Linter passed" | Linter \u2260 compiler |
| "Agent said success" | Verify independently |
| "I'm tired" | Exhaustion \u2260 excuse |
| "Partial check is enough" | Partial proves nothing |
| "Different words so rule doesn't apply" | Spirit over letter |

## Key Patterns

**Tests:**
\`\`\`
\u2705 [Run test command] [See: 34/34 pass] "All tests pass"
\u274C "Should pass now" / "Looks correct"
\`\`\`

**Regression tests (TDD Red-Green):**
\`\`\`
\u2705 Write \u2192 Run (pass) \u2192 Revert fix \u2192 Run (MUST FAIL) \u2192 Restore \u2192 Run (pass)
\u274C "I've written a regression test" (without red-green verification)
\`\`\`

**Build:**
\`\`\`
\u2705 [Run build] [See: exit 0] "Build passes"
\u274C "Linter passed" (linter doesn't check compilation)
\`\`\`

**Requirements:**
\`\`\`
\u2705 Re-read plan \u2192 Create checklist \u2192 Verify each \u2192 Report gaps or completion
\u274C "Tests pass, phase complete"
\`\`\`

**Agent delegation:**
\`\`\`
\u2705 Agent reports success \u2192 Check VCS diff \u2192 Verify changes \u2192 Report actual state
\u274C Trust agent report
\`\`\`

## Why This Matters

From 24 failure memories:
- your human partner said "I don't believe you" - trust broken
- Undefined functions shipped - would crash
- Missing requirements shipped - incomplete features
- Time wasted on false completion \u2192 redirect \u2192 rework
- Violates: "Honesty is a core value. If you lie, you'll be replaced."

## When To Apply

**ALWAYS before:**
- ANY variation of success/completion claims
- ANY expression of satisfaction
- ANY positive statement about work state
- Committing, PR creation, task completion
- Moving to next task
- Delegating to agents

**Rule applies to:**
- Exact phrases
- Paraphrases and synonyms
- Implications of success
- ANY communication suggesting completion/correctness

## The Bottom Line

**No shortcuts for verification.**

Run the command. Read the output. THEN claim the result.

This is non-negotiable.
`
  },
  {
    name: "docker-mastery",
    description: "Use when working with Docker containers \u2014 debugging container failures, writing Dockerfiles, docker-compose for integration tests, image optimization, or deploying containerized applications",
    body: `# Docker Mastery

## Overview

Docker is a **platform for building, shipping, and running applications**, not just isolation.

Agents should think in containers: reproducible environments, declarative dependencies, isolated execution.

**Core principle:** Containers are not virtual machines. They share the kernel but isolate processes, filesystems, and networks.

**Violating the letter of these guidelines is violating the spirit of containerization.**

## The Iron Law

\`\`\`
UNDERSTAND THE CONTAINER BEFORE DEBUGGING INSIDE IT
\`\`\`

Before exec'ing into a container or adding debug commands:
1. Check the image (what's installed?)
2. Check mounts (what host files are visible?)
3. Check environment variables (what config is passed?)
4. Check the Dockerfile (how was it built?)

Random debugging inside containers wastes time. Context first, then debug.

## When to Use

Use this skill when working with:
- **Container build failures** - Dockerfile errors, missing dependencies
- **Test environment setup** - Reproducible test environments across machines
- **Integration test orchestration** - Multi-service setups (DB + API + tests)
- **Dockerfile authoring** - Writing efficient, maintainable Dockerfiles
- **Image size optimization** - Reducing image size, layer caching
- **Deployment** - Containerized application deployment
- **Sandbox debugging** - Issues with Hive's Docker sandbox mode

**Use this ESPECIALLY when:**
- Tests pass locally but fail in CI (environment mismatch)
- "Works on my machine" problems
- Need to test against specific dependency versions
- Multiple services must coordinate (database + API)
- Building for production deployment

## Core Concepts

### Images vs Containers

- **Image**: Read-only template (built from Dockerfile)
- **Container**: Running instance of an image (ephemeral by default)

\`\`\`bash
# Build once
docker build -t myapp:latest .

# Run many times
docker run --rm myapp:latest
docker run --rm -e DEBUG=true myapp:latest
\`\`\`

**Key insight:** Changes inside containers are lost unless committed or volumes are used.

### Volumes & Mounts

Mount host directories into containers for persistence and code sharing:

\`\`\`bash
# Mount current directory to /app in container
docker run -v $(pwd):/app myapp:latest

# Hive worktrees are mounted automatically
# Your code edits (via Read/Write/editFiles tools) affect the host
# Container sees the same files at runtime
\`\`\`

**How Hive uses this:** Worktree is mounted into container, so file tools work on host, bash commands run in container.

### Multi-Stage Builds

Minimize image size by using multiple FROM statements:

\`\`\`dockerfile
# Build stage (large, has compilers)
FROM node:22 AS builder
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install
COPY . .
RUN bun run build

# Runtime stage (small, production only)
FROM node:22-slim
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
CMD ["node", "dist/index.js"]
\`\`\`

**Result:** Builder tools (TypeScript, bundlers) not included in final image.

### Docker Compose for Multi-Service Setups

Define multiple services in \`docker-compose.yml\`:

\`\`\`yaml
version: '3.8'
services:
  db:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: testpass
    ports:
      - "5432:5432"
  
  api:
    build: .
    environment:
      DATABASE_URL: postgres://db:5432/testdb
    depends_on:
      - db
    ports:
      - "3000:3000"
\`\`\`

Run with: \`docker-compose up -d\`
Teardown with: \`docker-compose down\`

### Network Modes

- **bridge** (default): Isolated network, containers can talk to each other by name
- **host**: Container uses host's network directly (no isolation)
- **none**: No network access

**When to use host mode:** Debugging network issues, accessing host services directly.

## Common Patterns

### Debug a Failing Container

**Problem:** Container exits immediately, logs unclear.

**Pattern:**
1. Run interactively with shell:
   \`\`\`bash
   docker run -it --entrypoint sh myapp:latest
   \`\`\`
2. Inspect filesystem, check if dependencies exist:
   \`\`\`bash
   ls /app
   which node
   cat /etc/os-release
   \`\`\`
3. Run command manually to see full error:
   \`\`\`bash
   node dist/index.js
   \`\`\`

### Integration Tests with Docker Compose

**Pattern:**
1. Define services in \`docker-compose.test.yml\`
2. Add wait logic (wait for DB to be ready)
3. Run tests
4. Teardown

\`\`\`yaml
# docker-compose.test.yml
services:
  db:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: test
  test:
    build: .
    command: bun run test:integration
    depends_on:
      - db
    environment:
      DATABASE_URL: postgres://postgres:test@db:5432/testdb
\`\`\`

\`\`\`bash
docker-compose -f docker-compose.test.yml up --abort-on-container-exit
docker-compose -f docker-compose.test.yml down
\`\`\`

### Optimize Dockerfile

**Anti-pattern:**
\`\`\`dockerfile
FROM node:22
WORKDIR /app
COPY . .              # Copies everything (including node_modules, .git)
RUN bun install       # Invalidates cache on any file change
CMD ["bun", "run", "start"]
\`\`\`

**Optimized:**
\`\`\`dockerfile
FROM node:22-slim     # Use slim variant
WORKDIR /app

# Copy dependency files first (cache layer)
COPY package.json bun.lockb ./
RUN bun install --production

# Copy source code (changes frequently)
COPY src ./src
COPY tsconfig.json ./

CMD ["bun", "run", "start"]
\`\`\`

**Add \`.dockerignore\`:**
\`\`\`
node_modules
.git
.env
*.log
dist
.DS_Store
\`\`\`

### Handle Missing Dependencies

**Problem:** Command fails with "not found" in container.

**Pattern:**
1. Check if dependency is in image:
   \`\`\`bash
   docker run -it myapp:latest which git
   \`\`\`
2. If missing, add to Dockerfile:
   \`\`\`dockerfile
   RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*
   \`\`\`
3. Or use a richer base image (e.g., \`node:22\` instead of \`node:22-slim\`).

## Sandbox Integration

### How Hive Wraps Commands

When sandbox mode is active (\`sandbox: 'docker'\` in config):
1. Hive hook intercepts bash commands before execution
2. Wraps with \`docker run --rm -v <worktree>:/workspace -w /workspace <image> sh -c "<command>"\`
3. Command runs in container, but file edits (read/editFiles) still affect the host

**Workers are unaware** \u2014 they issue normal bash commands, Hive handles containerization.

### When Host Access is Needed

Some operations MUST run on host:
- **Git operations** (commit, push, branch) \u2014 repo state is on host
- **Host-level tools** (Docker itself, system config)
- **Cross-worktree operations** (accessing main repo from worktree)

**Pattern:** Use \`HOST:\` prefix to escape sandbox:
\`\`\`bash
HOST: git status
HOST: docker ps
\`\`\`

**If you need host access frequently:** Report as blocked and ask user if sandbox should be disabled for this task.

### Persistent vs Ephemeral Containers

**Current (v1.2.0):** Each command runs \`docker run --rm\` (ephemeral). State does NOT persist.

Example: \`npm install lodash\` in one command \u2192 not available in next command.

**Workaround:** Install dependencies in Dockerfile, not at runtime.

**Future:** \`docker exec\` will reuse containers, persisting state across commands.

### Auto-Detected Images

Hive detects runtime from project files:
- \`package.json\` \u2192 \`node:22-slim\`
- \`requirements.txt\` / \`pyproject.toml\` \u2192 \`python:3.12-slim\`
- \`go.mod\` \u2192 \`golang:1.22-slim\`
- \`Cargo.toml\` \u2192 \`rust:1.77-slim\`
- \`Dockerfile\` \u2192 Builds from project Dockerfile
- Fallback \u2192 \`ubuntu:24.04\`

**Override:** Set \`dockerImage\` in config (\`~/.config/opencode/agent_hive.json\`).

## Red Flags - STOP

If you catch yourself:
- Installing packages on host instead of in Dockerfile
- Running \`docker build\` without \`.dockerignore\` (cache invalidation)
- Using \`latest\` tag in production (non-reproducible)
- Ignoring container exit codes (hides failures)
- Assuming state persists between \`docker run --rm\` commands
- Using absolute host paths in Dockerfile (not portable)
- Copying secrets into image layers (leaks credentials)

**ALL of these mean: STOP. Review pattern.**

## Anti-Patterns

| Excuse | Reality |
|--------|---------|
| "I'll just run it on host" | Container mismatch bugs are worse to debug later. Build happens in container anyway. |
| "Works in my container, don't need CI" | CI uses different cache state. Always test in CI-like environment. |
| "I'll optimize the Dockerfile later" | Later never comes. Large images slow down deployments now. |
| "latest tag is fine for dev" | Dev should match prod. Pin versions or face surprises. |
| "Don't need .dockerignore, COPY is fast" | Invalidates cache on every file change. Wastes minutes per build. |
| "Install at runtime, not in image" | Ephemeral containers lose state. Slows down every command. |
| "Skip depends_on, services start fast" | Race conditions in integration tests. Use wait-for-it or health checks. |

## Verification Before Completion

Before marking Docker work complete:

- [ ] Container runs successfully: \`docker run --rm <image> <command>\` exits 0
- [ ] Tests pass inside container (not just on host)
- [ ] No host pollution (dependencies installed in container, not host)
- [ ] \`.dockerignore\` exists if using \`COPY . .\`
- [ ] Image tags are pinned (not \`latest\`) for production
- [ ] Multi-stage build used if applicable (separate build/runtime)
- [ ] Integration tests teardown properly (\`docker-compose down\`)

**If any fail:** Don't claim success. Fix or report blocker.

## Quick Reference

| Task | Command Pattern |
|------|----------------|
| **Debug container** | \`docker run -it --entrypoint sh <image>\` |
| **Run with mounts** | \`docker run -v $(pwd):/app <image>\` |
| **Multi-service tests** | \`docker-compose up --abort-on-container-exit\` |
| **Check image contents** | \`docker run --rm <image> ls /app\` |
| **Optimize build** | Add \`.dockerignore\`, use multi-stage, pin versions |
| **Escape Hive sandbox** | Prefix with \`HOST:\` (e.g., \`HOST: git status\`) |

## Related Skills

- **Refer to the skill at .github/skills/systematic-debugging/SKILL.md** - When container behavior is unexpected
- **Refer to the skill at .github/skills/test-driven-development/SKILL.md** - Write tests that run in containers
- **Refer to the skill at .github/skills/verification-before-completion/SKILL.md** - Verify tests pass in container before claiming done
`
  },
  {
    name: "agents-md-mastery",
    description: "Use when bootstrapping, updating, or reviewing AGENTS.md \u2014 teaches what makes effective agent memory, how to structure sections, signal vs noise filtering, and when to prune stale entries",
    body: `# AGENTS.md Mastery

## Overview

**AGENTS.md is pseudo-memory loaded at session start.** Every line shapes agent behavior for the entire session. Quality beats quantity. Write for agents, not humans.

Unlike code comments or READMEs, AGENTS.md entries persist across all agent sessions. A bad entry misleads agents hundreds of times. A missing entry causes the same mistake repeatedly.

**Core principle:** Optimize for agent comprehension and behavioral change, not human readability.

## The Iron Law

\`\`\`
EVERY ENTRY MUST CHANGE AGENT BEHAVIOR
\`\`\`

If an entry doesn't:
- Prevent a specific mistake
- Enable a capability the agent would otherwise miss
- Override a default assumption that breaks in this codebase

...then it doesn't belong in AGENTS.md.

**Test:** Would a fresh agent session make a mistake without this entry? If no \u2192 noise.

## When to Use

| Trigger | Action |
|---------|--------|
| New project bootstrap | Write initial AGENTS.md with build/test/style basics |
| Feature completion | Sync new learnings via \`hive_agents_md\` |
| Periodic review | Audit for stale/redundant entries (quarterly) |
| Quality issues | Agent repeating mistakes? Check if AGENTS.md has the fix |

## What Makes Good Agent Memory

### Signal Entries (Keep)

\u2705 **Project-specific conventions:**
- "We use Zustand, not Redux \u2014 never add Redux"
- "Auth lives in \`/lib/auth\` \u2014 never create auth elsewhere"
- "Run \`bun test\` not \`npm test\` (we don't use npm)"

\u2705 **Non-obvious patterns:**
- "Use \`.js\` extension for local imports (ESM requirement)"
- "Worktrees don't share \`node_modules\` \u2014 run \`bun install\` in each"
- "SandboxConfig is in \`dockerSandboxService.ts\`, NOT \`types.ts\`"

\u2705 **Gotchas that break builds:**
- "Never use \`ensureDirSync\` \u2014 doesn't exist. Use \`ensureDir\` (sync despite name)"
- "Import from \`../utils/paths.js\` not \`./paths\` (ESM strict)"

### Noise Entries (Remove)

\u274C **Agent already knows:**
- "This project uses TypeScript" (agent detects from files)
- "We follow semantic versioning" (universal convention)
- "Use descriptive variable names" (generic advice)

\u274C **Irrelevant metadata:**
- "Created on January 2024"
- "Originally written by X"
- "License: MIT" (in LICENSE file already)

\u274C **Describes what code does:**
- "FeatureService manages features" (agent can read code)
- "The system uses git worktrees" (observable from commands)

### Rule of Thumb

**Signal:** Changes how agent acts  
**Noise:** Documents what agent observes

## Section Structure for Fast Comprehension

Agents read AGENTS.md top-to-bottom once at session start. Put high-value info first:

\`\`\`markdown
# Project Name

## Build & Test Commands
# \u2190 Agents need this IMMEDIATELY
bun run build
bun run test
bun run release:check

## Code Style
# \u2190 Prevents syntax/import errors
- Semicolons: Yes
- Quotes: Single
- Imports: Use \`.js\` extension

## Architecture
# \u2190 Key directories, where things live
packages/
\u251C\u2500\u2500 hive-core/      # Shared logic
\u251C\u2500\u2500 opencode-hive/  # Plugin
\u2514\u2500\u2500 vscode-hive/    # Extension

## Important Patterns
# \u2190 How to do common tasks correctly
Use \`readText\` from paths.ts, not fs.readFileSync

## Gotchas & Anti-Patterns
# \u2190 Things that break or mislead
NEVER use \`ensureDirSync\` \u2014 doesn't exist
\`\`\`

**Keep total under 500 lines.** Beyond that, agents lose focus and miss critical entries.

## The Sync Workflow

After completing a feature, sync learnings to AGENTS.md:

1. **Trigger sync:**
   \`\`\`typescript
   hive_agents_md({ action: 'sync', feature: 'feature-name' })
   \`\`\`

2. **Review each proposal:**
   - Read the proposed change
   - Ask: "Does this change agent behavior?"
   - Check: Is this already obvious from code/files?

3. **Accept signal, reject noise:**
   - \u274C "TypeScript is used" \u2192 Agent detects this
   - \u2705 "Use \`.js\` extension for imports" \u2192 Prevents build failures

4. **Apply approved changes:**
   \`\`\`typescript
   hive_agents_md({ action: 'apply' })
   \`\`\`

**Warning:** Don't auto-approve all proposals. One bad entry pollutes all future sessions.

## When to Prune

Remove entries when they become:

**Outdated:**
- "We use Redux" \u2192 Project migrated to Zustand
- "Node 16 compatibility required" \u2192 Now on Node 22

**Redundant:**
- "Use single quotes" + "Strings use single quotes" \u2192 Keep one
- Near-duplicates in different sections

**Too generic:**
- "Write clear code" \u2192 Applies to any project
- "Test your changes" \u2192 Universal advice

**Describing code:**
- "TaskService manages tasks" \u2192 Agent can read \`TaskService\` class
- "Worktrees are in \`.hive/.worktrees/\`" \u2192 Observable from filesystem

**Proven unnecessary:**
- Entry added 6 months ago, but agents haven't hit that issue since

## Red Flags

| Warning Sign | Why It's Bad | Fix |
|-------------|-------------|-----|
| AGENTS.md > 800 lines | Agents lose focus, miss critical info | Prune aggressively |
| Describes what code does | Agent can read code | Remove descriptions |
| Missing build/test commands | First thing agents need | Add at top |
| No gotchas section | Agents repeat past mistakes | Document failure modes |
| Generic best practices | Doesn't change behavior | Remove or make specific |
| Outdated patterns | Misleads agents | Prune during sync |

## Anti-Patterns

| Anti-Pattern | Better Approach |
|-------------|----------------|
| "Document everything" | Document only what changes behavior |
| "Keep for historical record" | Version control is history |
| "Might be useful someday" | Add when proven necessary |
| "Explains the system" | Agents read code for that |
| "Comprehensive reference" | AGENTS.md is a filter, not docs |

## Good Examples

**Build Commands (High value, agents need immediately):**
\`\`\`markdown
## Build & Test Commands
bun run build              # Build all packages
bun run test               # Run all tests
bun run release:check      # Full CI check
\`\`\`

**Project-Specific Convention (Prevents mistakes):**
\`\`\`markdown
## Code Style
- Imports: Use \`.js\` extension for local imports (ESM requirement)
- Paths: Import from \`../utils/paths.js\` never \`./paths\`
\`\`\`

**Non-Obvious Gotcha (Prevents build failure):**
\`\`\`markdown
## Important Patterns
Use \`ensureDir\` from paths.ts \u2014 sync despite name
NEVER use \`ensureDirSync\` (doesn't exist)
\`\`\`

## Bad Examples

**Generic advice (agent already knows):**
\`\`\`markdown
## Best Practices
- Use meaningful variable names
- Write unit tests
- Follow DRY principle
\`\`\`

**Describes code (agent can read it):**
\`\`\`markdown
## Architecture
The FeatureService class manages features. It has methods
for create, read, update, and delete operations.
\`\`\`

**Irrelevant metadata:**
\`\`\`markdown
## Project History
Created in January 2024 by the platform team.
Originally built for internal use.
\`\`\`

## Verification

Before finalizing AGENTS.md updates:

- [ ] Every entry answers: "What mistake does this prevent?"
- [ ] No generic advice that applies to all projects
- [ ] Build/test commands are first
- [ ] Gotchas section exists and is populated
- [ ] Total length under 500 lines (800 absolute max)
- [ ] No entries describing what code does
- [ ] Fresh agent session would benefit from each entry

## Summary

AGENTS.md is **behavioral memory**, not documentation:
- Write for agents, optimize for behavior change
- Signal = prevents mistakes, Noise = describes observables
- Sync after features, prune quarterly
- Test: Would agent make a mistake without this entry?

**Quality > quantity. Every line counts.**
`
  }
];
function getBuiltinSkills() {
  return builtinSkillSources.map((skill) => ({
    name: skill.name,
    description: skill.description,
    content: generateSkillFile({
      name: skill.name,
      description: skill.description,
      content: skill.body
    })
  }));
}

// src/commands/initNest.ts
var EXTENSION_ID = "tctinh.vscode-hive";
var BACKWARD_COMPAT_SKILL = `---
name: hive
description: Hive plan-first development workflow
---

${generateHiveWorkflowInstructions().body.split(/^---$/m).slice(2).join("---").trim()}
`;
function ensureDir2(dirPath) {
  fs13.mkdirSync(dirPath, { recursive: true });
}
function writeFile2(filePath, content) {
  ensureDir2(path13.dirname(filePath));
  fs13.writeFileSync(filePath, content);
}
async function loadVscode() {
  return await import("vscode");
}
function generateAgents() {
  return generateAllAgents({ extensionId: EXTENSION_ID });
}
function generateBuiltinSkills() {
  return getBuiltinSkills();
}
function generateInstructions() {
  return generateAllInstructions();
}
function generatePlugin() {
  return generatePluginManifest();
}
async function initNest(projectRoot, deps) {
  const vscode7 = deps?.vscodeApi ?? await loadVscode();
  await vscode7.window.withProgress(
    {
      location: vscode7.ProgressLocation.Notification,
      title: "Initializing Hive Nest"
    },
    async (progress) => {
      progress.report({ message: "Creating Hive directories..." });
      ensureDir2(path13.join(projectRoot, ".hive"));
      ensureDir2(path13.join(projectRoot, ".hive", "features"));
      ensureDir2(path13.join(projectRoot, ".hive", "skills"));
      ensureDir2(path13.join(projectRoot, ".claude", "skills"));
      ensureDir2(path13.join(projectRoot, ".opencode", "skill"));
      progress.report({ message: "Generating Copilot agents..." });
      for (const agent of generateAgents()) {
        writeFile2(path13.join(projectRoot, ".github", "agents", agent.filename), agent.content);
      }
      progress.report({ message: "Generating builtin skills..." });
      for (const skill of generateBuiltinSkills()) {
        writeFile2(path13.join(projectRoot, ".github", "skills", skill.name, "SKILL.md"), skill.content);
      }
      progress.report({ message: "Generating hooks..." });
      for (const hook of generateAllHooks()) {
        writeFile2(path13.join(projectRoot, ".github", "hooks", hook.configFilename), `${JSON.stringify(hook.config, null, 2)}
`);
        for (const script of hook.scripts) {
          const scriptPath = path13.join(projectRoot, ".github", "hooks", "scripts", script.filename);
          writeFile2(scriptPath, script.content);
          fs13.chmodSync(scriptPath, 493);
        }
      }
      progress.report({ message: "Generating instructions..." });
      for (const instruction of generateInstructions()) {
        writeFile2(path13.join(projectRoot, ".github", "instructions", instruction.filename), instruction.body);
      }
      progress.report({ message: "Generating plugin manifest..." });
      writeFile2(path13.join(projectRoot, "plugin.json"), `${JSON.stringify(generatePlugin(), null, 2)}
`);
      writeFile2(path13.join(projectRoot, ".claude", "skills", "hive", "SKILL.md"), BACKWARD_COMPAT_SKILL);
      writeFile2(path13.join(projectRoot, ".opencode", "skill", "hive", "SKILL.md"), BACKWARD_COMPAT_SKILL);
    }
  );
  await vscode7.window.showInformationMessage("Hive Nest initialized! Created 4 agents, 11 skills, 2 hooks, 2 instructions.");
}

// src/commands/regenerateAgents.ts
var fs14 = __toESM(require("fs"));
var path14 = __toESM(require("path"));
var EXTENSION_ID2 = "tctinh.vscode-hive";
async function loadVscode2() {
  return await import("vscode");
}
async function loadGenerateAgents() {
  const { generateAllAgents: generateAllAgents2 } = await Promise.resolve().then(() => (init_agents(), agents_exports));
  return () => generateAllAgents2({ extensionId: EXTENSION_ID2 });
}
async function regenerateAgents(workspaceRoot, deps = {}) {
  const vscode7 = deps.vscodeApi ?? await loadVscode2();
  const generateAgents2 = deps.generateAgents ?? await loadGenerateAgents();
  const confirm = await vscode7.window.showQuickPick(
    [
      { label: "Regenerate agents", description: "Overwrite all agent files with latest templates" },
      { label: "Cancel", description: "Do nothing" }
    ],
    { title: "Regenerate Hive Agents" }
  );
  if (!confirm || confirm.label === "Cancel") {
    return;
  }
  const agents = generateAgents2();
  const agentsDir = path14.join(workspaceRoot, ".github", "agents");
  fs14.mkdirSync(agentsDir, { recursive: true });
  const existingFiles = fs14.readdirSync(agentsDir).filter((filename) => filename.endsWith(".agent.md"));
  for (const filename of existingFiles) {
    fs14.unlinkSync(path14.join(agentsDir, filename));
  }
  for (const agent of agents) {
    fs14.writeFileSync(path14.join(agentsDir, agent.filename), agent.content);
  }
  await vscode7.window.showInformationMessage(`Hive: Regenerated ${agents.length} agents`);
}

// src/extension.ts
function getReviewTarget(workspaceRoot, filePath) {
  const normalizedWorkspace = workspaceRoot.replace(/\\/g, "/").replace(/\/+$/, "");
  const normalizedPath = filePath.replace(/\\/g, "/");
  const compareWorkspace = process.platform === "win32" ? normalizedWorkspace.toLowerCase() : normalizedWorkspace;
  const comparePath = process.platform === "win32" ? normalizedPath.toLowerCase() : normalizedPath;
  if (!comparePath.startsWith(`${compareWorkspace}/`)) {
    return null;
  }
  const planMatch = normalizedPath.match(/\.hive\/features\/([^/]+)\/plan\.md$/);
  if (planMatch) {
    return { featureName: planMatch[1], document: "plan" };
  }
  const overviewMatch = normalizedPath.match(/\.hive\/features\/([^/]+)\/context\/overview\.md$/);
  if (overviewMatch) {
    return { featureName: overviewMatch[1], document: "overview" };
  }
  return null;
}
function getReviewCommentsPath2(workspaceRoot, featureName, document2) {
  if (document2 === "plan") {
    const canonicalPath = path15.join(workspaceRoot, ".hive", "features", featureName, "comments", "plan.json");
    const legacyPath = path15.join(workspaceRoot, ".hive", "features", featureName, "comments.json");
    return fs15.existsSync(canonicalPath) ? canonicalPath : fs15.existsSync(legacyPath) ? legacyPath : canonicalPath;
  }
  return path15.join(workspaceRoot, ".hive", "features", featureName, "comments", "overview.json");
}
function findHiveRoot(startPath) {
  let current = startPath;
  while (current !== path15.dirname(current)) {
    if (fs15.existsSync(path15.join(current, ".hive"))) {
      return current;
    }
    current = path15.dirname(current);
  }
  return null;
}
var HiveExtension = class {
  constructor(context, workspaceFolder) {
    this.context = context;
    this.workspaceFolder = workspaceFolder;
  }
  sidebarProvider = null;
  launcher = null;
  commentController = null;
  hiveWatcher = null;
  creationWatcher = null;
  workspaceRoot = null;
  initialized = false;
  initialize() {
    this.workspaceRoot = findHiveRoot(this.workspaceFolder);
    if (this.workspaceRoot) {
      this.initializeWithHive(this.workspaceRoot);
    } else {
      this.initializeWithoutHive();
    }
  }
  initializeWithHive(workspaceRoot) {
    if (this.initialized) return;
    this.initialized = true;
    this.sidebarProvider = new HiveSidebarProvider(workspaceRoot);
    this.launcher = new Launcher(workspaceRoot);
    this.commentController = new PlanCommentController(workspaceRoot);
    vscode6.window.registerTreeDataProvider("hive.features", this.sidebarProvider);
    this.commentController.registerCommands(this.context);
    vscode6.commands.executeCommand("setContext", "hive.hasHiveRoot", true);
    registerAllTools(this.context, [
      ...getFeatureTools(workspaceRoot),
      ...getPlanTools(workspaceRoot),
      ...getTaskTools(workspaceRoot),
      ...getExecTools(workspaceRoot),
      ...getMergeTools(workspaceRoot),
      ...getContextTools(workspaceRoot),
      ...getStatusTools(workspaceRoot),
      ...getAgentsMdTools(workspaceRoot),
      ...getSkillTools(workspaceRoot)
    ]);
    this.hiveWatcher = new HiveWatcher(workspaceRoot, () => {
      this.sidebarProvider?.refresh();
    });
    this.context.subscriptions.push({ dispose: () => this.hiveWatcher?.dispose() });
    if (this.creationWatcher) {
      this.creationWatcher.dispose();
      this.creationWatcher = null;
    }
  }
  initializeWithoutHive() {
    vscode6.commands.executeCommand("setContext", "hive.hasHiveRoot", false);
    this.creationWatcher = vscode6.workspace.createFileSystemWatcher(
      new vscode6.RelativePattern(this.workspaceFolder, ".hive/**")
    );
    const onHiveCreated = () => {
      const newRoot = findHiveRoot(this.workspaceFolder);
      if (newRoot && !this.initialized) {
        this.workspaceRoot = newRoot;
        this.initializeWithHive(newRoot);
        vscode6.window.showInformationMessage("Hive: .hive directory detected, extension activated");
      }
    };
    this.creationWatcher.onDidCreate(onHiveCreated);
    this.context.subscriptions.push(this.creationWatcher);
  }
  registerCommands() {
    const workspaceFolder = this.workspaceFolder;
    this.context.subscriptions.push(
      vscode6.commands.registerCommand("hive.initNest", async () => {
        await initNest(workspaceFolder);
        const newRoot = findHiveRoot(workspaceFolder);
        if (newRoot && !this.initialized) {
          this.workspaceRoot = newRoot;
          this.initializeWithHive(newRoot);
        }
      }),
      vscode6.commands.registerCommand("hive.refresh", () => {
        if (!this.initialized) {
          const newRoot = findHiveRoot(workspaceFolder);
          if (newRoot) {
            this.workspaceRoot = newRoot;
            this.initializeWithHive(newRoot);
          } else {
            vscode6.window.showWarningMessage("Hive: No .hive directory found. Use @Hive in Copilot Chat to create a feature.");
            return;
          }
        }
        this.sidebarProvider?.refresh();
      }),
      vscode6.commands.registerCommand("hive.regenerateAgents", async () => {
        if (this.workspaceRoot) {
          await regenerateAgents(this.workspaceRoot);
        }
      }),
      vscode6.commands.registerCommand("hive.newFeature", async () => {
        const name = await vscode6.window.showInputBox({
          prompt: "Feature name",
          placeHolder: "my-feature"
        });
        if (name && this.workspaceRoot) {
          const featureService = new FeatureService(this.workspaceRoot);
          try {
            featureService.create(name);
            this.sidebarProvider?.refresh();
            vscode6.window.showInformationMessage(`Hive: Feature "${name}" created. Use @Hive in Copilot Chat to write a plan.`);
          } catch (error) {
            vscode6.window.showErrorMessage(`Hive: Failed to create feature - ${error}`);
          }
        } else if (name) {
          const hiveDir = path15.join(workspaceFolder, ".hive");
          fs15.mkdirSync(hiveDir, { recursive: true });
          this.workspaceRoot = workspaceFolder;
          this.initializeWithHive(workspaceFolder);
          const featureService = new FeatureService(workspaceFolder);
          featureService.create(name);
          this.sidebarProvider?.refresh();
          vscode6.window.showInformationMessage(`Hive: Feature "${name}" created. Use @Hive in Copilot Chat to write a plan.`);
        }
      }),
      vscode6.commands.registerCommand("hive.openFeature", (featureName) => {
        this.launcher?.openFeature(featureName);
      }),
      vscode6.commands.registerCommand("hive.openTask", (item) => {
        if (item?.featureName && item?.folder) {
          this.launcher?.openTask(item.featureName, item.folder);
        }
      }),
      vscode6.commands.registerCommand("hive.openFile", (filePath) => {
        if (filePath) {
          this.launcher?.openFile(filePath);
        }
      }),
      vscode6.commands.registerCommand("hive.approvePlan", async (item) => {
        if (item?.featureName && this.workspaceRoot) {
          const featureService = new FeatureService(this.workspaceRoot);
          const planService = new PlanService(this.workspaceRoot);
          const reviewCounts = featureService.getInfo(item.featureName)?.reviewCounts ?? { plan: 0, overview: 0 };
          const unresolvedTotal = reviewCounts.plan + reviewCounts.overview;
          if (unresolvedTotal > 0) {
            const documents = [
              reviewCounts.plan > 0 ? `plan (${reviewCounts.plan})` : null,
              reviewCounts.overview > 0 ? `overview (${reviewCounts.overview})` : null
            ].filter(Boolean).join(", ");
            vscode6.window.showWarningMessage(`Hive: Cannot approve - ${unresolvedTotal} unresolved review comment(s) remain across ${documents}. Address them first.`);
            return;
          }
          try {
            planService.approve(item.featureName);
            this.sidebarProvider?.refresh();
            vscode6.window.showInformationMessage(`Hive: Plan approved for "${item.featureName}". Use @Hive to sync tasks.`);
          } catch (error) {
            vscode6.window.showErrorMessage(`Hive: Failed to approve plan - ${error}`);
          }
        }
      }),
      vscode6.commands.registerCommand("hive.syncTasks", async (item) => {
        if (item?.featureName && this.workspaceRoot) {
          const featureService = new FeatureService(this.workspaceRoot);
          const taskService = new TaskService(this.workspaceRoot);
          const featureData = featureService.get(item.featureName);
          if (!featureData || featureData.status === "planning") {
            vscode6.window.showWarningMessage("Hive: Plan must be approved before syncing tasks.");
            return;
          }
          try {
            const result = taskService.sync(item.featureName);
            if (featureData.status === "approved") {
              featureService.updateStatus(item.featureName, "executing");
            }
            this.sidebarProvider?.refresh();
            vscode6.window.showInformationMessage(`Hive: ${result.created.length} tasks created for "${item.featureName}".`);
          } catch (error) {
            vscode6.window.showErrorMessage(`Hive: Failed to sync tasks - ${error}`);
          }
        }
      }),
      vscode6.commands.registerCommand("hive.startTask", async (item) => {
        if (item?.featureName && item?.folder && this.workspaceRoot) {
          const worktreeService = new WorktreeService({
            baseDir: this.workspaceRoot,
            hiveDir: path15.join(this.workspaceRoot, ".hive")
          });
          const taskService = new TaskService(this.workspaceRoot);
          try {
            const worktree = await worktreeService.create(item.featureName, item.folder);
            taskService.update(item.featureName, item.folder, { status: "in_progress" });
            this.sidebarProvider?.refresh();
            const openWorktree = await vscode6.window.showInformationMessage(
              `Hive: Worktree created at ${worktree.path}`,
              "Open in New Window"
            );
            if (openWorktree === "Open in New Window") {
              this.launcher?.openTask(item.featureName, item.folder);
            }
          } catch (error) {
            vscode6.window.showErrorMessage(`Hive: Failed to start task - ${error}`);
          }
        }
      }),
      vscode6.commands.registerCommand("hive.plan.doneReview", async () => {
        const editor = vscode6.window.activeTextEditor;
        if (!editor) return;
        if (!this.workspaceRoot) {
          vscode6.window.showErrorMessage("Hive: No .hive directory found");
          return;
        }
        const filePath = editor.document.uri.fsPath;
        const target = getReviewTarget(this.workspaceRoot, filePath);
        if (!target) {
          vscode6.window.showErrorMessage("Not a reviewable plan.md or context/overview.md file");
          return;
        }
        const commentsPath = getReviewCommentsPath2(this.workspaceRoot, target.featureName, target.document);
        let comments2 = [];
        try {
          const commentsData = JSON.parse(fs15.readFileSync(commentsPath, "utf-8"));
          comments2 = commentsData.threads || [];
        } catch (error) {
        }
        const hasComments = comments2.length > 0;
        const documentLabel = target.document === "overview" ? "Overview" : "Plan";
        const inputPrompt = hasComments ? `${documentLabel}: ${comments2.length} comment(s) found. Add feedback or leave empty to submit comments only` : `Enter your ${documentLabel.toLowerCase()} review feedback (or leave empty to approve)`;
        const userInput = await vscode6.window.showInputBox({
          prompt: inputPrompt,
          placeHolder: hasComments ? "Additional feedback (optional)" : 'e.g., "looks good" to approve, or describe changes needed'
        });
        if (userInput === void 0) return;
        let feedback;
        if (hasComments) {
          const allComments = comments2.map((c) => `Line ${c.line}: ${c.body}`).join("\n");
          feedback = userInput === "" ? `${documentLabel} review comments:
${allComments}` : `${documentLabel} review comments:
${allComments}

Additional feedback: ${userInput}`;
        } else {
          feedback = userInput === "" ? `${documentLabel} approved` : `${documentLabel} review feedback: ${userInput}`;
        }
        vscode6.window.showInformationMessage(
          `Hive: ${hasComments ? "Comments submitted" : "Review submitted"}. Use @Hive in Copilot Chat to continue.`
        );
        await vscode6.env.clipboard.writeText(`@Hive ${feedback}`);
        vscode6.window.showInformationMessage("Hive: Feedback copied to clipboard. Paste in Copilot Chat.");
      })
    );
  }
};
function activate(context) {
  const workspaceFolder = vscode6.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceFolder) return;
  const extension = new HiveExtension(context, workspaceFolder);
  extension.registerCommands();
  extension.initialize();
}
function deactivate() {
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
//# sourceMappingURL=extension.js.map
