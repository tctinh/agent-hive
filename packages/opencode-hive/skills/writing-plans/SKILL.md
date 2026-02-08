---
name: writing-plans
description: Use when you have a spec or requirements for a multi-step task, before touching code
---

# Writing Plans

## Overview

Write comprehensive implementation plans assuming the engineer has zero context for our codebase and questionable taste. Document everything they need to know: which files to touch for each task, code, testing, docs they might need to check, how to test it. Give them the whole plan as bite-sized tasks. DRY. YAGNI. TDD. Frequent commits.

Assume they are a skilled developer, but know almost nothing about our toolset or problem domain. Assume they don't know good test design very well.

**Announce at start:** "I'm using the writing-plans skill to create the implementation plan."

**Context:** Planning is read-only. Use `hive_feature_create` + `hive_plan_write` and avoid worktrees during planning.

**Save plans to:** `hive_plan_write` (writes to `.hive/features/<feature>/plan.md`)

## Bite-Sized Task Granularity

**Each step is one action (2-5 minutes):**
- "Write the failing test" - step
- "Run it to make sure it fails" - step
- "Implement the minimal code to make the test pass" - step
- "Run the tests and make sure they pass" - step
- "Commit" - step

## Plan Structure

**Every plan MUST follow this structure:**

````markdown
# [Feature Name]

## Discovery

### Original Request
- "{User's exact words}"

### Interview Summary
- {Point}: {Decision}

### Research Findings
- `{file:lines}`: {Finding}

---

## Non-Goals (What we're NOT building)
- {Explicit exclusion}

---

## Tasks

### 1. Task Name

Use the Task Structure template below for every task.
````


## Task Structure

The **Depends on** annotation declares task execution order:
- **Depends on**: none — No dependencies; can run immediately or in parallel
- **Depends on**: 1 — Depends on task 1
- **Depends on**: 1, 3 — Depends on tasks 1 and 3

Always include **Depends on** for each task. Use `none` to enable parallel starts.

````markdown
### N. Task Name

**Depends on**: none

**Files:**
- Create: `exact/path/to/file.py`
- Modify: `exact/path/to/existing.py:123-145`
- Test: `tests/exact/path/to/test.py`

**What to do**:
- Step 1: Write the failing test
  ```python
  def test_specific_behavior():
      result = function(input)
      assert result == expected
  ```
- Step 2: Run test to verify it fails
  - Run: `pytest tests/path/test.py::test_name -v`
  - Expected: FAIL with "function not defined"
- Step 3: Write minimal implementation
  ```python
  def function(input):
      return expected
  ```
- Step 4: Run test to verify it passes
  - Run: `pytest tests/path/test.py::test_name -v`
  - Expected: PASS
- Step 5: Commit
  ```bash
  git add tests/path/test.py src/path/file.py
  git commit -m "feat: add specific feature"
  ```

**Must NOT do**:
- {Task guardrail}

**References**:
- `{file:lines}` — {Why this reference matters}

**Verify**:
- [ ] Run: `{command}` → {expected}
- [ ] {Additional acceptance criteria}

All verification MUST be agent-executable (no human intervention):
✅ `bun test` → all pass
✅ `curl -X POST /api/x` → 201
❌ "User manually tests..."
❌ "Visually confirm..."
````

## Remember
- Exact file paths always
- Complete code in plan (not "add validation")
- Exact commands with expected output
- Reference relevant skills with @ syntax
- DRY, YAGNI, TDD, frequent commits
- All acceptance criteria must be agent-executable (zero human intervention)

## Execution Handoff

After saving the plan, ask whether to consult Hygienic (Consultant/Reviewer/Debugger) before offering execution choice.

Plan complete and saved to `.hive/features/<feature>/plan.md`.

Two execution options:
1. Subagent-Driven (this session) - I dispatch fresh subagent per task, review between tasks, fast iteration
2. Parallel Session (separate) - Open new session with executing-plans, batch execution with checkpoints

Which approach?

**If Subagent-Driven chosen:**
- Stay in this session
- Fresh subagent per task + code review

**If Parallel Session chosen:**
- Guide them to open new session in worktree
- **REQUIRED SUB-SKILL:** New session uses hive_skill:executing-plans
