---
description: "Repository-wide GitHub Copilot steering for Hive workflows"
---

Use AGENTS.md for the full Hive operating model and non-negotiable plan-first guardrails.

Use .github/instructions/ for path-specific coding and workflow guidance, and .github/prompts/ for reusable entry points such as plan creation, plan review, execution, review handoff, and completion verification.

Load .github/skills/ only when the current task triggers that workflow: parallel read-only investigation, bugs or test failures, implementation work, or completion claims.

Use Copilot memory only for durable notes and todo for multi-step work.

Use vscode/askQuestions for practical structured decision checkpoints wherever Copilot supports it. Use plain chat only as a fallback when the tool is unavailable or a truly lightweight clarification is better.

When web research, browser inspection, or end-to-end verification is needed, prefer built-in browser tools and Playwright MCP over extension-specific substitutes.
