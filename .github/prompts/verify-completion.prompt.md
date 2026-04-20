---
name: "Verify Hive Completion"
description: "Run final verification and summarize completion readiness."
agent: "hive"
model: "gpt-5.4"
tools:
  - "read"
  - "search"
  - "execute"
  - "tctinh.vscode-hive/hiveStatus"
---

Apply the verification-before-completion standard: gather fresh verification evidence before claiming the work is complete.

Run the relevant checks, summarize the observed results, and state whether the execution batch is ready to close or needs follow-up. Use AGENTS.md and existing verification commands as the source of truth for required checks.
