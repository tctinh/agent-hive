export interface SkillDefinition {
  name: string;
  description: string;
  content: string;
}

const MAX_SKILL_NAME_LENGTH = 64;
const MIN_SKILL_DESCRIPTION_LENGTH = 10;
const MAX_SKILL_DESCRIPTION_LENGTH = 1024;
const MAX_SKILL_CONTENT_LENGTH = 30000;

function ensureSkillName(name: string): string {
  const trimmed = name.trim();

  if (trimmed.length === 0 || trimmed.length > MAX_SKILL_NAME_LENGTH) {
    throw new Error(`Skill name must be between 1 and ${MAX_SKILL_NAME_LENGTH} characters.`);
  }

  return trimmed;
}

function ensureSkillDescription(description: string): string {
  const trimmed = description.trim();

  if (trimmed.length < MIN_SKILL_DESCRIPTION_LENGTH || trimmed.length > MAX_SKILL_DESCRIPTION_LENGTH) {
    throw new Error(
      `Skill description must be between ${MIN_SKILL_DESCRIPTION_LENGTH} and ${MAX_SKILL_DESCRIPTION_LENGTH} characters.`,
    );
  }

  return trimmed;
}

function stripFrontmatter(content: string): string {
  const normalized = content.trim();

  if (!normalized.startsWith('---\n')) {
    return normalized;
  }

  const endIndex = normalized.indexOf('\n---\n', 4);

  if (endIndex === -1) {
    return normalized;
  }

  return normalized.slice(endIndex + 5).trim();
}

function buildFrontmatter(name: string, description: string): string {
  return `---\nname: ${name}\ndescription: ${description}\n---`;
}

function assertSkillContentLength(content: string): string {
  if (content.length > MAX_SKILL_CONTENT_LENGTH) {
    throw new Error(`Skill content must be at most ${MAX_SKILL_CONTENT_LENGTH} characters.`);
  }

  return content;
}

export function generateSkillFile(skill: SkillDefinition): string {
  const name = ensureSkillName(skill.name);
  const description = ensureSkillDescription(skill.description);
  const body = stripFrontmatter(skill.content);
  const content = `${buildFrontmatter(name, description)}\n\n${body}\n`;

  return assertSkillContentLength(content);
}

interface BuiltinSkillSource {
  name: string;
  description: string;
  body: string;
}

const builtinSkillSources: BuiltinSkillSource[] = [
  {
    name: 'writing-plans',
    description: 'Use when you have a spec or requirements for a multi-step task, before touching code',
    body: `# Writing Plans

## Overview

Write comprehensive implementation plans assuming the engineer has zero context for our codebase and questionable taste. Document everything they need to know: which files to touch for each task, code, testing, docs they might need to check, how to test it. Give them the whole plan as bite-sized tasks. DRY. YAGNI. TDD. Frequent commits.

Assume they are a skilled developer, but know almost nothing about our toolset or problem domain. Assume they don't know good test design very well.

**Announce at start:** "I'm using the writing-plans skill to create the implementation plan."

**Context:** Planning is read-only. Use \`hive_feature_create\` + \`hive_plan_write\` and keep implementation out of the planning session.

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

## Design Summary

{Concise human-facing summary of the feature before task details. Optional Mermaid is allowed here for dependency or sequence overview only.}

---

## Tasks

### 1. Task Name

Use the Task Structure template below for every task.
\`\`\`\`


## Task Structure

The **Depends on** annotation declares task execution order:
- **Depends on**: none — No dependencies; can run immediately or in parallel
- **Depends on**: 1 — Depends on task 1
- **Depends on**: 1, 3 — Depends on tasks 1 and 3

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
- \`{file:lines}\` — {Why this reference matters}

**Verify**:
- [ ] Run: \`{command}\` → {expected}
- [ ] {Additional acceptance criteria}

All verification MUST be agent-executable (no human intervention):
✅ \`bun test\` → all pass
✅ \`curl -X POST /api/x\` → 201
❌ "User manually tests..."
❌ "Visually confirm..."
\`\`\`\`

## Remember
- Exact file paths always
- Complete code in plan (not "add validation")
- Exact commands with expected output
- Reference relevant skills with @ syntax
- DRY, YAGNI, TDD, frequent commits
- All acceptance criteria must be agent-executable (zero human intervention)
- Treat \`plan.md\` as the human-facing review surface and execution truth
- Every plan needs a concise human-facing \`Design Summary\` before \`## Tasks\`
- Make that section an overview/design summary before \`## Tasks\`
- Use Copilot memory or normal file edits when planning notes are needed; do not depend on special-purpose note helpers

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
- Guide them to open a new Copilot session focused on execution
- **REQUIRED SUB-SKILL:** New session uses Refer to the skill at .github/skills/executing-plans/SKILL.md
`,
  },
  {
    name: 'executing-plans',
    description: 'Use when you have a written implementation plan to execute in a separate session with review checkpoints',
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

Use \`hive_status()\` to get the **runnable** list — tasks with all dependencies satisfied.

Only \`done\` satisfies dependencies (not \`blocked\`, \`failed\`, \`partial\`, \`cancelled\`).

**When 2+ tasks are runnable:**
- Prefer \`vscode/askQuestions\` for a structured choice: "Multiple tasks are runnable: [list]. Run in parallel, sequential, or a specific subset?"
- Fall back to asking directly in chat only when \`vscode/askQuestions\` is unavailable or a lightweight follow-up is enough
- Record the decision in Copilot memory or current working notes only when future turns need it

**When 1 task is runnable:** Proceed directly.

### Step 3: Execute Batch

For each task in the batch:
1. Delegate implementation directly to @forager
2. Make sure the worker reads the approved plan and records progress with \`hive_task_update\`
3. Follow each step exactly (plan has bite-sized steps)
4. Run verifications as specified and confirm the task state is updated accurately

### Step 4: Report
When batch complete:
- Show what was implemented
- Show verification output
- Say: "Ready for feedback."

### Step 4.5: Post-Batch Hygienic Review

After the batch report, prefer \`vscode/askQuestions\` to ask whether the user wants a Hygienic code review for the batch.
Fall back to asking directly in chat only when \`vscode/askQuestions\` is unavailable or a lightweight follow-up is enough.
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
`,
  },
  {
    name: 'brainstorming',
    description: 'Use before any creative work - creating features, building components, adding functionality, or modifying behavior. Explores user intent, requirements and design before implementation.',
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
`,
  },
  {
    name: 'parallel-exploration',
    description: 'Use when you need parallel, read-only exploration with the agent tool (Scout fan-out)',
    body: `# Parallel Exploration (Scout Fan-Out)

## Overview

When you need to answer "where/how does X work?" across multiple domains (codebase, tests, docs, OSS), investigating sequentially wastes time. Each investigation is independent and can happen in parallel.

**Core principle:** Decompose into independent sub-questions, invoke one scout agent per sub-question, and synthesize the results together.

**Safe in Planning mode:** This is read-only exploration. It is OK to use during exploratory research even when there is no feature, no plan, and no approved tasks.

**This skill is for read-only research.** For parallel implementation work, refer to the skill at .github/skills/dispatching-parallel-agents/SKILL.md and invoke @forager directly for each runnable task.

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
`,
  },
  {
    name: 'dispatching-parallel-agents',
    description: 'Use when facing 2+ independent tasks that can be worked on without shared state or sequential dependencies',
    body: `# Dispatching Parallel Agents

## Overview

When you have multiple unrelated failures (different test files, different subsystems, different bugs), investigating them sequentially wastes time. Each investigation is independent and can happen in parallel.

**Core principle:** Dispatch one agent per independent problem domain. Let them work concurrently.

## Prerequisite: Check Runnable Tasks

Before dispatching, use \`hive_status()\` to get the **runnable** list — tasks whose dependencies are all satisfied.

**Only dispatch tasks that are runnable.** Never start tasks with unmet dependencies.

Only \`done\` satisfies dependencies (not \`blocked\`, \`failed\`, \`partial\`, \`cancelled\`).

**Ask the operator first:**
- Prefer \`vscode/askQuestions\` for the approval prompt: "These tasks are runnable and independent: [list]. Execute in parallel?"
- Fall back to asking directly in chat only when \`vscode/askQuestions\` is unavailable or a lightweight follow-up is enough
- Record the decision in Copilot memory or current working notes only when future turns need it
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

\`\`\`text
Invoke @forager for runnable task 01 and require \`hive_task_update\` for progress reporting.
Invoke @forager for runnable task 02 and require \`hive_task_update\` for progress reporting.
Invoke @forager for runnable task 03 and require \`hive_task_update\` for progress reporting.
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
- Apply any needed follow-up edits directly and rerun verification

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

**❌ Too broad:** "Fix all the tests" - agent gets lost
**✅ Specific:** "Fix agent-tool-abort.test.ts" - focused scope

**❌ No context:** "Fix the race condition" - agent doesn't know where
**✅ Context:** Paste the error messages and test names

**❌ No constraints:** Agent might refactor everything
**✅ Constraints:** "Do NOT change production code" or "Fix tests only"

**❌ Vague output:** "Fix it" - you don't know what changed
**✅ Specific:** "Return summary of root cause and changes"

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
Agent 1 → Fix agent-tool-abort.test.ts
Agent 2 → Fix batch-completion-behavior.test.ts
Agent 3 → Fix tool-approval-race-conditions.test.ts
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
`,
  },
  {
    name: 'systematic-debugging',
    description: 'Use when encountering any bug, test failure, or unexpected behavior, before proposing fixes',
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
   - If not reproducible → gather more data, don't guess

3. **Check Recent Changes**
   - What changed that could cause this?
   - Git diff, recent commits
   - New dependencies, config changes
   - Environmental differences

4. **Gather Evidence in Multi-Component Systems**

   **WHEN system has multiple components (CI → build → signing, API → service → database):**

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

   **This reveals:** Which layer fails (secrets → workflow ✓, workflow → build ✗)

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
   - Did it work? Yes → Phase 4
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
   - **If ≥ 3: STOP and question the architecture (step 5 below)**
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
| "I see the problem, let me fix it" | Seeing symptoms ≠ understanding root cause. |
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
`,
  },
  {
    name: 'test-driven-development',
    description: 'Use when implementing any feature or bugfix, before writing implementation code',
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
- "It worked when I tried it" ≠ comprehensive

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

30 minutes of tests after ≠ TDD. You get coverage, lose proof tests work.

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "Too simple to test" | Simple code breaks. Test takes 30 seconds. |
| "I'll test after" | Tests passing immediately prove nothing. |
| "Tests after achieve same goals" | Tests-after = "what does this do?" Tests-first = "what should this do?" |
| "Already manually tested" | Ad-hoc ≠ systematic. No record, can't re-run. |
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
Production code → test exists and failed first
Otherwise → not TDD
\`\`\`

No exceptions without your human partner's permission.
`,
  },
  {
    name: 'code-reviewer',
    description: 'Use when reviewing implementation changes against an approved plan or task (especially before merging or between Hive tasks) to catch missing requirements, YAGNI, dead code, and risky patterns',
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
`,
  },
  {
    name: 'verification-before-completion',
    description: 'Use when about to claim work is complete, fixed, or passing, before committing or creating PRs - requires running verification commands and confirming output before making any success claims; evidence before assertions always',
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
| "I'm confident" | Confidence ≠ evidence |
| "Just this once" | No exceptions |
| "Linter passed" | Linter ≠ compiler |
| "Agent said success" | Verify independently |
| "I'm tired" | Exhaustion ≠ excuse |
| "Partial check is enough" | Partial proves nothing |
| "Different words so rule doesn't apply" | Spirit over letter |

## Key Patterns

**Tests:**
\`\`\`
✅ [Run test command] [See: 34/34 pass] "All tests pass"
❌ "Should pass now" / "Looks correct"
\`\`\`

**Regression tests (TDD Red-Green):**
\`\`\`
✅ Write → Run (pass) → Revert fix → Run (MUST FAIL) → Restore → Run (pass)
❌ "I've written a regression test" (without red-green verification)
\`\`\`

**Build:**
\`\`\`
✅ [Run build] [See: exit 0] "Build passes"
❌ "Linter passed" (linter doesn't check compilation)
\`\`\`

**Requirements:**
\`\`\`
✅ Re-read plan → Create checklist → Verify each → Report gaps or completion
❌ "Tests pass, phase complete"
\`\`\`

**Agent delegation:**
\`\`\`
✅ Agent reports success → Check VCS diff → Verify changes → Report actual state
❌ Trust agent report
\`\`\`

## Why This Matters

From 24 failure memories:
- your human partner said "I don't believe you" - trust broken
- Undefined functions shipped - would crash
- Missing requirements shipped - incomplete features
- Time wasted on false completion → redirect → rework
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
`,
  },
  {
    name: 'docker-mastery',
    description: 'Use when working with Docker containers — debugging container failures, writing Dockerfiles, docker-compose for integration tests, image optimization, or deploying containerized applications',
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

**Workers are unaware** — they issue normal bash commands, Hive handles containerization.

### When Host Access is Needed

Some operations MUST run on host:
- **Git operations** (commit, push, branch) — repo state is on host
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

Example: \`npm install lodash\` in one command → not available in next command.

**Workaround:** Install dependencies in Dockerfile, not at runtime.

**Future:** \`docker exec\` will reuse containers, persisting state across commands.

### Auto-Detected Images

Hive detects runtime from project files:
- \`package.json\` → \`node:22-slim\`
- \`requirements.txt\` / \`pyproject.toml\` → \`python:3.12-slim\`
- \`go.mod\` → \`golang:1.22-slim\`
- \`Cargo.toml\` → \`rust:1.77-slim\`
- \`Dockerfile\` → Builds from project Dockerfile
- Fallback → \`ubuntu:24.04\`

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
`,
  },
  {
    name: 'agents-md-mastery',
    description: 'Use when bootstrapping, updating, or reviewing AGENTS.md — teaches what makes effective agent memory, how to structure sections, signal vs noise filtering, and when to prune stale entries',
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

**Test:** Would a fresh agent session make a mistake without this entry? If no → noise.

## When to Use

| Trigger | Action |
|---------|--------|
| New project bootstrap | Write initial AGENTS.md with build/test/style basics |
| Feature completion | Sync new learnings by editing AGENTS.md directly after reviewing the diff |
| Periodic review | Audit for stale/redundant entries (quarterly) |
| Quality issues | Agent repeating mistakes? Check if AGENTS.md has the fix |

## What Makes Good Agent Memory

### Signal Entries (Keep)

✅ **Project-specific conventions:**
- "We use Zustand, not Redux — never add Redux"
- "Auth lives in \`/lib/auth\` — never create auth elsewhere"
- "Run \`bun test\` not \`npm test\` (we don't use npm)"

✅ **Non-obvious patterns:**
- "Use \`.js\` extension for local imports (ESM requirement)"
- "Use Copilot memory for durable notes; don\'t invent extra workflow files"
- "SandboxConfig is in \`dockerSandboxService.ts\`, NOT \`types.ts\`"

✅ **Gotchas that break builds:**
- "Never use \`ensureDirSync\` — doesn't exist. Use \`ensureDir\` (sync despite name)"
- "Import from \`../utils/paths.js\` not \`./paths\` (ESM strict)"

### Noise Entries (Remove)

❌ **Agent already knows:**
- "This project uses TypeScript" (agent detects from files)
- "We follow semantic versioning" (universal convention)
- "Use descriptive variable names" (generic advice)

❌ **Irrelevant metadata:**
- "Created on January 2024"
- "Originally written by X"
- "License: MIT" (in LICENSE file already)

❌ **Describes what code does:**
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
# ← Agents need this IMMEDIATELY
bun run build
bun run test
bun run release:check

## Code Style
# ← Prevents syntax/import errors
- Semicolons: Yes
- Quotes: Single
- Imports: Use \`.js\` extension

## Architecture
# ← Key directories, where things live
packages/
├── hive-core/      # Shared logic
├── opencode-hive/  # Plugin
└── vscode-hive/    # Extension

## Important Patterns
# ← How to do common tasks correctly
Use \`readText\` from paths.ts, not fs.readFileSync

## Gotchas & Anti-Patterns
# ← Things that break or mislead
NEVER use \`ensureDirSync\` — doesn't exist
\`\`\`

**Keep total under 500 lines.** Beyond that, agents lose focus and miss critical entries.

## The Sync Workflow

After completing a feature, sync learnings to AGENTS.md:

1. **Draft the proposed additions:**
  - Use Copilot memory or temporary notes if you need a staging area
  - Keep each proposal to one behavior-changing point

2. **Review each proposal:**
   - Read the proposed change
   - Ask: "Does this change agent behavior?"
   - Check: Is this already obvious from code/files?

3. **Accept signal, reject noise:**
   - ❌ "TypeScript is used" → Agent detects this
   - ✅ "Use \`.js\` extension for imports" → Prevents build failures

4. **Apply approved changes directly:**
  - Edit AGENTS.md with the approved additions and removals
  - Review the diff before finalizing

**Warning:** Don't auto-approve all proposals. One bad entry pollutes all future sessions.

## When to Prune

Remove entries when they become:

**Outdated:**
- "We use Redux" → Project migrated to Zustand
- "Node 16 compatibility required" → Now on Node 22

**Redundant:**
- "Use single quotes" + "Strings use single quotes" → Keep one
- Near-duplicates in different sections

**Too generic:**
- "Write clear code" → Applies to any project
- "Test your changes" → Universal advice

**Describing code:**
- "TaskService manages tasks" → Agent can read \`TaskService\` class
- "Worktrees are in \`.hive/.worktrees/\`" → Observable from filesystem

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
Use \`ensureDir\` from paths.ts — sync despite name
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
`,
  },
];

export function getBuiltinSkills(): SkillDefinition[] {
  return builtinSkillSources.map((skill) => ({
    name: skill.name,
    description: skill.description,
    content: generateSkillFile({
      name: skill.name,
      description: skill.description,
      content: skill.body,
    }),
  }));
}
