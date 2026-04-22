## Hive Workflow

This project uses Agent Hive for plan-first development. When working on features:

1. Start a new feature with `hive_feature_create`, or check for an active feature in `.hive/active-feature`
2. If a feature is active, call `hive_status` to understand current state
3. Follow the plan-first workflow: do discovery before planning when the change needs investigation, then Plan (`hive_plan_write`) → Approve → Execute → Verify → Complete (`hive_feature_complete`)
4. Workers execute in isolated worktrees and must call `hive_worktree_commit` when done
5. After merging a batch of tasks, run build+test before proceeding

Key directories:
- `.hive/features/<name>/plan.md` — The approved execution plan
- `.hive/features/<name>/tasks/` — Task specs and status
- `.hive/features/<name>/context/` — Shared context files
