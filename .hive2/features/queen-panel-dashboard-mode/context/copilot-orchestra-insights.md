# Copilot Orchestra Insights

## Source
https://github.com/ShepAlderson/copilot-orchestra
(Cloned to /home/tctinh/agent-hive/copilot-orchestra/)

## What It Is

A multi-agent orchestration system using VSCode Insiders' custom chat modes (`.agent.md` files).

## Architecture

```
CONDUCTOR (Sonnet 4.5)
├── planning-subagent (Sonnet 4.5) - Research, 90% confidence rule
├── implement-subagent (Haiku 4.5) - TDD execution, minimal code
└── code-review-subagent (Sonnet 4.5) - Quality gate
```

## Workflow

```
User Request
    ↓
CONDUCTOR → planning-subagent (research)
    ↓
CONDUCTOR creates plan
    ↓
USER APPROVAL (mandatory pause)
    ↓
For each phase:
    ├── CONDUCTOR → implement-subagent (TDD)
    ├── CONDUCTOR → code-review-subagent
    │       ├── APPROVED → proceed
    │       ├── NEEDS_REVISION → back to implement
    │       └── FAILED → consult user
    └── USER COMMIT (mandatory pause)
    ↓
Final completion report
```

## Key Patterns

### 1. Mandatory Pause Points
- After plan presentation (before implementation)
- After each phase (before commit)
- On FAILED review status

### 2. Structured Review Verdict
```
Status: APPROVED | NEEDS_REVISION | FAILED
Summary: Brief assessment
Strengths: What was done well
Issues: [CRITICAL|MAJOR|MINOR] with file/line refs
Recommendations: Actionable suggestions
Next Steps: What conductor should do
```

### 3. TDD Enforcement
1. Write failing tests first
2. Run tests → confirm fail
3. Write minimal code
4. Run tests → confirm pass
5. Lint/format

### 4. 90% Confidence Rule (Planning)
Stop research when you can answer:
- What files/functions are relevant?
- How does existing code work?
- What patterns/conventions does codebase use?
- What dependencies are involved?

### 5. Model Selection by Role
- Planning: Sonnet 4.5 (comprehensive analysis)
- Implementation: Haiku 4.5 (efficient execution)
- Review: Sonnet 4.5 (thorough assessment)

## Artifacts Generated

```
plans/
├── {task-name}-plan.md           # Approved plan
├── {task-name}-phase-N-complete.md  # Per-phase completion
└── {task-name}-complete.md       # Final summary
```

## Hive Integration Opportunities

| Orchestra | Hive | Status |
|-----------|------|--------|
| Conductor | Hive Queen | ✅ Have |
| planning-subagent | explore/librarian agents | ✅ Have |
| implement-subagent | sisyphus_task workers | ✅ Have |
| code-review-subagent | ❌ | **Add** |
| Mandatory pauses | Queen Panel steering | In progress |
| NEEDS_REVISION | Blocker priority | In progress |
| Phase completion docs | Task reports | ✅ Have |

## Key Takeaway

The **code-review-subagent** pattern is the missing piece. Every task should have:
1. Implementation
2. Automated review with structured verdict
3. If NEEDS_REVISION → blocker comment → halt
4. If APPROVED → proceed

This creates a quality gate that the blocker system can leverage.
