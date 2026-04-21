---
name: "Request Hive Review"
description: "Hand completed implementation to Hygienic for code review readiness."
agent: "hive"
model: "gpt-5.4"
tools:
  - "read"
  - "search"
  - "tctinh.vscode-hive/hiveStatus"
---

Prepare a concise code review handoff for Hygienic. Summarize the completed implementation batch, the relevant files or commits, and the verification already run.

Keep this focused on review readiness and code review context so Hygienic can assess the implementation without re-planning the feature.
