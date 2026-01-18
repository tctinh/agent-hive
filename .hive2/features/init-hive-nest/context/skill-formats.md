# Skill File Formats by Platform

## OpenCode Skills
**Location**: `.opencode/skill/<name>/SKILL.md`

```markdown
---
name: skill-name
description: What this skill does (1-1024 chars)
---

# Skill Title

Instructions here...
```

**Discovery**: Agent calls `skill({ name: "skill-name" })` to load.

## Claude Code Skills
**Location**: `.claude/skills/<name>/SKILL.md`

Same format as OpenCode. Claude Code auto-discovers from this path.

## GitHub Copilot Agents
**Location**: `.github/agents/Name.agent.md`

```markdown
---
description: 'What this agent does'
tools: ['runSubagent', 'tctinh.vscode-hive/hiveFeatureCreate', ...]
---

# Agent Name

Instructions here...
```

**Discovery**: Copilot auto-discovers from `.github/agents/`.

**Tool naming**:
- In frontmatter: `tctinh.vscode-hive/hiveFeatureCreate` (full path)
- In instructions: `featureCreate` (short name works)

## Hive Internal Skills
**Location**: `.hive/skills/<name>/SKILL.md`

Project-specific skills, same format as OpenCode.

## Tool List for Copilot Agent

```yaml
tools: [
  'runSubagent',
  'tctinh.vscode-hive/hiveFeatureCreate',
  'tctinh.vscode-hive/hiveFeatureList',
  'tctinh.vscode-hive/hiveFeatureComplete',
  'tctinh.vscode-hive/hivePlanWrite',
  'tctinh.vscode-hive/hivePlanRead',
  'tctinh.vscode-hive/hivePlanApprove',
  'tctinh.vscode-hive/hiveTasksSync',
  'tctinh.vscode-hive/hiveTaskCreate',
  'tctinh.vscode-hive/hiveTaskUpdate',
  'tctinh.vscode-hive/hiveSubtaskCreate',
  'tctinh.vscode-hive/hiveSubtaskUpdate',
  'tctinh.vscode-hive/hiveSubtaskList',
  'tctinh.vscode-hive/hiveSubtaskSpecWrite',
  'tctinh.vscode-hive/hiveSubtaskReportWrite',
  'tctinh.vscode-hive/hiveExecStart',
  'tctinh.vscode-hive/hiveExecComplete',
  'tctinh.vscode-hive/hiveExecAbort',
  'tctinh.vscode-hive/hiveMerge',
  'tctinh.vscode-hive/hiveWorktreeList',
  'tctinh.vscode-hive/hiveContextWrite',
  'tctinh.vscode-hive/hiveContextRead',
  'tctinh.vscode-hive/hiveContextList',
  'tctinh.vscode-hive/hiveSessionOpen',
  'tctinh.vscode-hive/hiveSessionList'
]
```
