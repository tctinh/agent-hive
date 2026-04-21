---
name: "Plan Hive Feature"
description: "Create or revise a Hive feature plan with plan-first guardrails."
agent: "hive"
model: "gpt-5.4"
tools:
  - "read"
  - "search"
  - "search/codebase"
  - "search/usages"
  - "vscode/askQuestions"
  - "tctinh.vscode-hive/hiveStatus"
  - "tctinh.vscode-hive/hivePlanWrite"
---

Start by checking AGENTS.md, .github/copilot-instructions.md, and any relevant .github/instructions/ files. Keep planning read-only, use built-in exploration tools first, then write or revise the plan with hive_plan_write.

If key requirements are missing, use vscode/askQuestions as the normal structured clarification path for the minimum practical decision checkpoints. Use plain chat only as a fallback when the tool is unavailable or a truly lightweight clarification is better.

Keep Hive's plan-first contract intact: no implementation edits, explicit task dependencies, exact file references, concrete verification commands, and an overview/design summary before ## Tasks in plan.md.
