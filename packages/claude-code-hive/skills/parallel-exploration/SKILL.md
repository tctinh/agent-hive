---
name: parallel-exploration
description: Use when you need parallel, read-only exploration with Agent() (Forager fan-out)
user-invocable: false
---

# Parallel Exploration (Forager Fan-Out)

## Overview

When you need to answer "where/how does X work?" across multiple domains (codebase, tests, docs, OSS), investigating sequentially wastes time. Each investigation is independent and can happen in parallel.

**Core principle:** Decompose into independent sub-questions that fit in one context window, spawn one Agent() per sub-question, then synthesize the bounded results.

**Safe in Planning mode:** This is read-only exploration. It is OK to use during exploratory research even when there is no feature, no plan, and no approved tasks.

**This skill is for read-only research.** For parallel implementation work, use `Skill("hive:dispatching-parallel-agents")` with Hive worktrees.

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
- It's a single focused question that is genuinely answerable with **one quick Grep + one file Read**
- Questions are dependent (answer A materially changes what to ask for B)
- Work involves file Edits (use Hive tasks / Forager instead)

**Important:** Do not treat "this is exploratory" as a reason to avoid delegation. This skill is specifically for exploratory research when fan-out makes it faster and cleaner.

## The Pattern

### 1. Decompose Into Independent Questions

Split your investigation into 2-4 independent sub-questions. Each sub-question should fit in one context window. If a request will not fit in one context window, narrow the slice, capture bounded findings, and return to Hive with recommended next steps instead of pushing toward an oversized final report. Good decomposition:

| Domain | Question Example |
|--------|------------------|
| Codebase | "Where is X implemented? What files define it?" |
| Tests | "How is X tested? What test patterns exist?" |
| Docs/OSS | "How do other projects implement X? What's the recommended pattern?" |
| Config | "How is X configured? What environment variables affect it?" |

**Bad decomposition (dependent questions):**
- "What is X?" then "How is X used?" (second depends on first)
- "Find the bug" then "Fix the bug" (not read-only)

**Stop and return to Hive when:**
- one more fan-out would broaden scope too far
- a sub-question no longer fits in one context window
- the next useful step is implementation rather than exploration

### 2. Spawn Agents (Fan-Out)

Launch all agents before waiting for any results:

```typescript
// Parallelize by issuing multiple Agent() calls in the same assistant message.
Agent({
  agent: 'hive:forager',
  prompt: `Where are API routes implemented and registered?
    - Find the tool definition
    - Find the plugin registration
    - Return file paths with line numbers`,
  run_in_background: true,
})

Agent({
  agent: 'hive:forager',
  prompt: `How does background task concurrency/queueing work?
    - Find the manager/scheduler code
    - Document the concurrency model
    - Return file paths with evidence`,
  run_in_background: true,
})

Agent({
  agent: 'hive:forager',
  prompt: `How does parent notification work for background tasks?
    - Where is the notification built?
    - How is it sent to the parent session?
    - Return file paths with evidence`,
  run_in_background: true,
})
```

**Key points:**
- Use `agent: 'hive:forager'` for read-only exploration
- Give each agent a clear, focused prompt
- Make prompts specific about what evidence to return

### 3. Collect Results

After the fan-out message, collect the agent results through the normal Agent() return flow. Do not invent background polling or a separate async workflow.

### 4. Synthesize Findings

When each agent completes, its result is returned directly. Collect the outputs from each agent and proceed to synthesis.

### 5. Cleanup (If Needed)

Combine results from all agents:
- Cross-reference findings (file X mentioned by agents A and B)
- Identify gaps (agent C found nothing, need different approach)
- Build coherent answer from parallel evidence
- If the remaining work would no longer fit in one context window, return to Hive with bounded findings and recommended next steps

No manual cancellation is required in agent mode.

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
// Parallelize by issuing multiple Agent() calls in the same assistant message.
Agent({
  agent: 'hive:forager',
  prompt: 'Where are API routes implemented? Find tool definition and registration.',
  run_in_background: true,
})

Agent({
  agent: 'hive:forager',
  prompt: 'How does background task concurrency work? Find the manager/scheduler.',
  run_in_background: true,
})

Agent({
  agent: 'hive:forager',
  prompt: 'How are parent sessions notified of task completion?',
  run_in_background: true,
})
```

**Results:**
- Agent 1: Found `background-tools.ts` (tool definition), `index.ts` (registration)
- Agent 2: Found `manager.ts` with concurrency=3 default, queue-based scheduling
- Agent 3: Found `session.prompt()` call in manager for parent notification

**Synthesis:** Complete picture of background task lifecycle in ~1/3 the time of sequential investigation.

## Common Mistakes

**Spawning sequentially (defeats the purpose):**
```typescript
// BAD: Wait for each before spawning next
await Agent({ ... });
await Agent({ ... });
```

```typescript
// GOOD: Spawn all in the same assistant message
Agent({ ..., run_in_background: true })
Agent({ ..., run_in_background: true })
Agent({ ..., run_in_background: true })
```

**Too many agents (diminishing returns):**
- 2-4 agents: Good parallelization
- 5+ agents: Overhead exceeds benefit, harder to synthesize

**Dependent questions:**
- Don't spawn agent B if it needs agent A's answer
- Either make them independent or run sequentially

**Using for Edits:**
- Forager is read-only; use Forager with Hive tasks for implementation
- This skill is for exploration, not execution

## Key Benefits

1. **Speed** - 3 investigations in time of 1
2. **Focus** - Each Forager has narrow scope
3. **Independence** - No interference between agents
4. **Flexibility** - Cancel unneeded agents, add new ones

## Verification

After using this pattern, verify:
- [ ] All agents spawned before collecting any results (true fan-out)
- [ ] Verified Agent() fan-out pattern used for parallel exploration
- [ ] Synthesized findings into coherent answer
