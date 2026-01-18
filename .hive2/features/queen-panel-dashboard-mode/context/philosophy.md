# Hive Philosophy

## Core Principle

**Human shapes, Agent details.**

```
NOT: Agent autonomous         → Slop
NOT: Human does everything    → No leverage  
YES: Human shapes, Agent details
```

## The Collaboration Model

| Phase | Human | Agent |
|-------|-------|-------|
| Requirements | Answers questions | Asks, organizes, synthesizes |
| Feature Setup | "I want X" | Creates feature, writes plan |
| Planning | Reviews, amends, comments | Revises based on feedback |
| Implementation | Reviews diff | Codes in worktree |
| Code Review | Approves/rejects | Fixes, iterates |

## Agent is a Tool, Not a Crew

No "Planner Agent" vs "Coder Agent" vs "Reviewer Agent".

Just: **Agent + Context = Behavior**

```
Same LLM + planning context = acts as planner
Same LLM + coding context   = acts as coder
Same LLM + review context   = acts as reviewer
```

Context shapes behavior. Skills provide context. Roles are unnecessary abstraction.

## Files Are The API

No databases. No APIs. No WebSockets.

```bash
# Block an agent
echo "Stop" > .hive/features/X/BLOCKED

# Request review
echo '{"summary":"..."}' > .../PENDING_REVIEW

# Approve
echo "APPROVED" > .../REVIEW_RESULT
rm .../PENDING_REVIEW
```

Polling. Files. Simple.

## No Session State

Agent starts fresh. Reads files. Works. Done.

If crash: Human restarts. Agent reads files again.

No resume logic. No crash recovery. No session tracking.

Files ARE the state.

## Simple Tools Beat Complex Tools

git > custom VCS
files > databases  
polling > websockets
terminal agent > IDE agent with 50 tools

The most effective tool is the simplest one that works.

## Human Is The Orchestrator

No multi-agent. No crews. No autonomous loops.

Human says: "Work on this task"
Agent works, requests review, blocks.
Human reviews, approves or rejects.
Agent continues or fixes.

Human controls the loop. Agent does the heavy lifting.
