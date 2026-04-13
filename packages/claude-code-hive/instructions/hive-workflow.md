## Hive Workflow

This project uses Agent Hive for plan-first development. When working on features:

1. Check for an active feature: look for `.hive/active-feature`
2. If a feature is active, call `hive_status` to understand current state
3. Follow the plan-first workflow: Discovery → Plan → Approve → Execute → Verify → Complete
4. Workers execute in isolated worktrees and must call `hive_worktree_commit` when done
5. After merging a batch of tasks, run build+test before proceeding

Key directories:
- `.hive/features/<name>/plan.md` — The approved execution plan
- `.hive/features/<name>/tasks/` — Task specs and status
- `.hive/features/<name>/context/` — Shared context files
