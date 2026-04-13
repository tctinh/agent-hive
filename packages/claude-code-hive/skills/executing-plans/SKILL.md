---
name: executing-plans
description: Use when you have a written implementation plan to execute in a separate session with review checkpoints
user-invocable: false
---

# Executing Plans

## Overview

Load plan, review critically, execute tasks in batches, report for review between batches.

**Core principle:** Batch execution with checkpoints for Hive review.

**Announce at start:** "I'm using the executing-plans skill to implement this plan."

## The Process

### Step 1: Load and Review Plan
1. Read plan file
2. Review critically - identify any questions or concerns about the plan
3. If concerns: Raise them with your human partner before starting
4. If no concerns: Create TodoWrite and proceed

### Step 2: Identify Runnable Tasks

Call `mcp__hive__hive_status()` to get the **runnable** list — tasks with all dependencies satisfied.

Only `done` satisfies dependencies (not `blocked`, `failed`, `partial`, `cancelled`).

**When 2+ tasks are runnable:**
- **Ask the operator** via `AskUserQuestion`: "Multiple tasks are runnable: [list]. Run in parallel, sequential, or a specific subset?"
- Record the decision with `Write(".hive/features/<feature>/context/execution-decisions.md", "...")` for future reference

**When 1 task is runnable:** Proceed directly.

### Step 3: Execute Batch

For each task in the batch:
1. Mark as in_progress
2. Follow each step exactly (plan has bite-sized steps)
3. Run verifications as specified
4. Mark as completed

### Step 4: Report
When batch complete:
- Show what was implemented
- Show verification output
- Say: "Ready for feedback."

### Step 4.5: Post-Batch Hygienic Review

After the batch report, ask the operator if they want a Hygienic code review for the batch.
If yes, run `Agent({ agent: "hive:hygienic", prompt: "Review implementation changes from the latest batch.", run_in_background: true })`.
Route review feedback through this decision tree before continuing:

| Feedback type | Action |
|---------------|--------|
| Minor / local to the completed batch | **Inline fix** — apply directly, no new task |
| New isolated work that does not affect downstream sequencing | **Manual task** — `hive_task_create()` for non-blocking ad-hoc work |
| Changes downstream sequencing, dependencies, or scope | **Plan amendment** — update `plan.md`, then `hive_tasks_sync({ refreshPending: true })` to rewrite pending tasks from the amended plan |

When amending the plan: append new task numbers at the end (do not renumber), update `Depends on:` entries to express the new DAG order, then sync.

### Step 5: Continue
After applying review feedback (or if none):
- Re-check `mcp__hive__hive_status()` for the updated **runnable** set — tasks whose dependencies are all satisfied
- Tasks blocked by unmet dependencies stay blocked until predecessors complete
- Execute the next batch of runnable tasks
- Repeat until complete

### Step 6: Complete Development

After all tasks complete and verified:
- Announce: "I'm using the verification-before-completion skill to complete this work."
- **REQUIRED SUB-SKILL:** Use Skill("hive:verification-before-completion")
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
