# Task: 02-add-initnest-command-to-vscode-hive

## Feature: init-hive-nest

## Context

## pr6-skill-implementation

# PR #6 Skill Implementation Reference

## Key Code from PR #6 to Adapt

### HiveSkill Interface
```typescript
interface HiveSkill {
  name: string;
  description: string;
  path: string;
  body: string;
}
```

### parseFrontmatter Function
```typescript
function parseFrontmatter(content: string): { frontmatter: Record<string, string>; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: content };
  
  const frontmatter: Record<string, string> = {};
  match[1].split('\n').forEach(line => {
    const [key, ...valueParts] = line.split(':');
    if (key && valueParts.length) {
      frontmatter[key.trim()] = valueParts.join(':').trim().replace(/^['"]|['"]$/g, '');
    }
  });
  return { frontmatter, body: match[2] };
}
```

### discoverHiveSkills Function
Scans `skills/<name>/SKILL.md` directories and returns skill objects.

### formatSkillsXml Function
Creates `<available_skills>` XML list for tool description.

### hive_skill Tool
- Discovers all skills at initialization
- Caches skill list
- Returns skill body when called with name
- Shows available skills in description

## hive-execution Skill Content (294 lines)

The skill covers:
1. **Pre-execution checklist** - feature exists, plan approved, tasks synced, base clean
2. **Sequential execution** - single executor, tasks in order
3. **Parallel execution** - multiple executors, phases, blockers
4. **Task lifecycle**: hive_exec_start → implement → hive_exec_complete → hive_merge(strategy=squash)
5. **Tool quick reference table**
6. **Commit discipline** - one commit per task, "hive(task): summary" format
7. **Error recovery** - exec_abort, merge conflicts, blocker handling
8. **Verification gate checklist**

## Skills Directory Structure (from PR #6)

```
packages/opencode-hive/
├── skills/
│   ├── decision/
│   │   └── SKILL.md
│   ├── plan/
│   │   └── SKILL.md
│   ├── step-log/
│   │   └── SKILL.md
│   └── hive-execution/
│       └── SKILL.md
├── package.json  # "files": ["dist/", "skills/"]
└── src/
    └── index.ts  # hive_skill tool
```


---

## skill-formats

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


## Completed Tasks

- 01-create-skill-templates-in-hive-core: Created skill templates in packages/hive-core/templates/skills/: hive-workflow.md (core lifecycle), hive-execution.md (worktree orchestration), hive-planning.md (writing effective plans), copilot-agent.md (GitHub Copilot agent template). Added src/templates.ts for template loading functions. Build succeeds.

