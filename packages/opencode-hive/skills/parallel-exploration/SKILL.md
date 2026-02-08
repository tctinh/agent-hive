---
name: parallel-exploration
description: Use when you need parallel, read-only exploration with task() (Scout fan-out)
---

# Parallel Exploration (Scout Fan-Out)

## Overview

When you need to answer "where/how does X work?" across multiple domains (codebase, tests, docs, OSS), investigating sequentially wastes time. Each investigation is independent and can happen in parallel.

**Core principle:** Decompose into independent sub-questions, spawn one task per sub-question, collect results asynchronously.

**Safe in Planning mode:** This is read-only exploration. It is OK to use during exploratory research even when there is no feature, no plan, and no approved tasks.

**This skill is for read-only research.** For parallel implementation work, use `hive_skill("dispatching-parallel-agents")` with `hive_worktree_create`.

## When to Use

**Default to this skill when:**
**Use when:**
- Investigation spans multiple domains (code + tests + docs)
- User asks **2+ questions across different domains** (e.g., code + tests, code + docs/OSS, code + config/runtime)
- Questions are independent (answer to A doesn't affect B)
- User asks **3+ independent questions** (often as a numbered list or separate bullets)
- No edits needed (read-only exploration)
- User asks for an explorationthat likely spans multiple files/packages
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

### 2. Spawn Tasks (Fan-Out)

Launch all tasks before waiting for any results:

```typescript
// Parallelize by issuing multiple task() calls in the same assistant message.
task({
  subagent_type: 'scout-researcher',
  description: 'Find API route implementation',
  prompt: `Where are API routes implemented and registered?
    - Find the tool definition
    - Find the plugin registration
    - Return file paths with line numbers`,
});

task({
  subagent_type: 'scout-researcher',
  description: 'Analyze background task concurrency',
  prompt: `How does background task concurrency/queueing work?
    - Find the manager/scheduler code
    - Document the concurrency model
    - Return file paths with evidence`,
});

task({
  subagent_type: 'scout-researcher',
  description: 'Find parent notification mechanism',
  prompt: `How does parent notification work for background tasks?
    - Where is the notification built?
    - How is it sent to the parent session?
    - Return file paths with evidence`,
});
```

**Key points:**
- Use `subagent_type: 'scout-researcher'` for read-only exploration
- Give each task a clear, focused `description`
- Make prompts specific about what evidence to return

### 3. Continue Working (Optional)

While tasks run, you can:
- Work on other aspects of the problem
- Prepare synthesis structure
- Start drafting based on what you already know

You'll receive a `<system-reminder>` notification when each task completes.

### 4. Collect Results

When each task completes, its result is returned directly. Collect the outputs from each task and proceed to synthesis.

### 5. Synthesize Findings

Combine results from all tasks:
- Cross-reference findings (file X mentioned by tasks A and B)
- Identify gaps (task C found nothing, need different approach)
- Build coherent answer from parallel evidence

### 6. Cleanup (If Needed)

No manual cancellation is required in task mode.

## Prompt Templates

### Codebase Slice

```
Investigate [TOPIC] in the codebase:
- Where is [X] defined/implemented?
- What files contain [X]?
- How does [X] interact with [Y]?

Return:
- File paths with line numbers
- Brief code snippets as evidence
- Key patterns observed
```

### Tests Slice

```
Investigate how [TOPIC] is tested:
- What test files cover [X]?
- What testing patterns are used?
- What edge cases are tested?

Return:
- Test file paths
- Example test patterns
- Coverage gaps if obvious
```

### Docs/OSS Slice

```
Research [TOPIC] in external sources:
- How do other projects implement [X]?
- What does the official documentation say?
- What are common patterns/anti-patterns?

Return:
- Links to relevant docs/repos
- Key recommendations
- Patterns that apply to our codebase
```

## Real Example

**Investigation:** "How does the API routing system work?"

**Decomposition:**
1. Implementation: Where are API routes defined?
2. Routing: How does route registration work?
3. Notifications: How are errors surfaced to the caller?

**Fan-out:**
```typescript
// Parallelize by issuing multiple task() calls in the same assistant message.
task({
  subagent_type: 'scout-researcher',
  description: 'Find API route implementation',
  prompt: 'Where are API routes implemented? Find tool definition and registration.',
});

task({
  subagent_type: 'scout-researcher',
  description: 'Analyze concurrency model',
  prompt: 'How does background task concurrency work? Find the manager/scheduler.',
});

task({
  subagent_type: 'scout-researcher',
  description: 'Find notification mechanism',
  prompt: 'How are parent sessions notified of task completion?',
});
```

**Results:**
- Task 1: Found `background-tools.ts` (tool definition), `index.ts` (registration)
- Task 2: Found `manager.ts` with concurrency=3 default, queue-based scheduling
- Task 3: Found `session.prompt()` call in manager for parent notification

**Synthesis:** Complete picture of background task lifecycle in ~1/3 the time of sequential investigation.

## Common Mistakes

**Spawning sequentially (defeats the purpose):**
```typescript
// BAD: Wait for each before spawning next
await task({ ... });
await task({ ... });
```

```typescript
// GOOD: Spawn all in the same assistant message
task({ ... });
task({ ... });
task({ ... });
```

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
- [ ] Verified `task()` fan-out pattern used for parallel exploration
- [ ] Synthesized findings into coherent answer
