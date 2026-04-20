---
description: "Repository-wide GitHub Copilot steering for Hive workflows"
---

Use AGENTS.md for the full Hive operating model and non-negotiable plan-first guardrails.

Use .github/instructions/ for path-specific coding and workflow guidance, and .github/prompts/ for reusable entry points such as plan creation, plan review, execution, review handoff, and completion verification.

Use .github/skills/ directly when a task benefits from a documented skill, and use Copilot memory for durable notes instead of extension-specific note-writing helpers.

Use vscode/askQuestions for practical structured decision checkpoints wherever Copilot supports it. Use plain chat only as a fallback when the tool is unavailable or a truly lightweight clarification is better.

When web research, browser inspection, or end-to-end verification is needed, prefer built-in browser tools and MCP integrations such as Playwright MCP over extension-specific substitutes.
