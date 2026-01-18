# Init Hive Nest

## Overview

One-click initialization that generates all configuration files for AI agents to use Hive across platforms:
- **OpenCode**: `.opencode/skill/<name>/SKILL.md`
- **GitHub Copilot**: `.github/agents/Hive.agent.md`
- **Claude Code**: `.claude/skills/<name>/SKILL.md`

When a user clicks "Init Hive Nest" in VS Code sidebar or runs the command:
1. Creates `.hive/` directory structure
2. Generates platform-specific agent/skill files
3. Generates comprehensive hive-workflow skill that teaches agents HOW to use Hive

## Design Decisions

### Skill Format: Unified SKILL.md

All platforms now support markdown-based skill files with YAML frontmatter:

```markdown
---
name: hive-workflow
description: Plan-first AI development with isolated git worktrees
---

# Hive Workflow

## When to Use This Skill
...
```

### Skill Locations

| Platform | Location | Notes |
|----------|----------|-------|
| OpenCode | `.opencode/skill/<name>/SKILL.md` | Official path per docs |
| Copilot | `.github/agents/Hive.agent.md` | Agent file with tools list |
| Claude Code | `.claude/skills/<name>/SKILL.md` | Same format as OpenCode |

### Skills to Generate

1. **hive-workflow** - Core lifecycle: plan → review → approve → execute → merge
2. **hive-execution** - Task execution in worktrees (adapted from PR #6)
3. **hive-planning** - Writing effective plans with proper task breakdown

---

## Tasks

### 1. Create skill templates in hive-core

**Goal**: Add skill template files to `packages/hive-core/templates/skills/`

**Files to create:**
- `packages/hive-core/templates/skills/hive-workflow.md`
- `packages/hive-core/templates/skills/hive-execution.md`
- `packages/hive-core/templates/skills/hive-planning.md`
- `packages/hive-core/templates/copilot-agent.md`

**hive-workflow.md** content (core skill):
```markdown
---
name: hive-workflow
description: Plan-first AI development with isolated git worktrees and human review
---

# Hive Workflow

You are working in a Hive-enabled repository. Follow this workflow.

## Lifecycle

```
Feature → Plan → Review → Approve → Execute → Merge → Complete
```

## Phase 1: Planning

1. `hive_feature_create({ name: "feature-name" })` - Creates feature directory
2. Research the codebase, save findings with `hive_context_write`
3. `hive_plan_write({ content: "# Feature\n\n## Tasks\n\n### 1. First task..." })`
4. STOP and tell user: "Plan written. Please review in VS Code."

## Phase 2: Review (Human)

- User reviews plan.md in VS Code
- User can add comments (appear as `> 💬 User: comment`)
- User clicks "Approve" when ready

## Phase 3: Execution

After user approves:
1. `hive_tasks_sync()` - Generates tasks from plan headings
2. For each task:
   - `hive_exec_start({ task: "task-name" })` - Creates worktree
   - Implement in isolated worktree
   - `hive_exec_complete({ task: "task-name", summary: "What was done" })`
3. `hive_merge({ task: "task-name", strategy: "squash" })` - Integrate to main

## Phase 4: Completion

After all tasks merged:
- `hive_feature_complete({ name: "feature-name" })`

## Rules

1. **Never skip planning** - Always write plan first
2. **Context is critical** - Save all research with `hive_context_write`
3. **Wait for approval** - Don't execute until user approves
4. **One task at a time** - Complete and merge before next
5. **Squash merges** - Keep history clean

## Tool Reference

| Tool | Purpose |
|------|---------|
| hive_feature_create | Start new feature |
| hive_plan_write | Write the plan |
| hive_plan_read | Check for user comments |
| hive_tasks_sync | Generate tasks from plan |
| hive_exec_start | Start working on task (creates worktree) |
| hive_exec_complete | Finish task (commits changes) |
| hive_merge | Integrate task to main branch |
| hive_context_write | Save persistent context |
| hive_context_read | Read saved context |
```

**Verification:**
- Files exist in `packages/hive-core/templates/skills/`
- Each has valid YAML frontmatter
- `bun run build` in hive-core succeeds

---

### 2. Add initNest command to vscode-hive

**Goal**: Add "Init Hive Nest" command that generates all files

**Files to modify:**
- `packages/vscode-hive/src/extension.ts` - Register command
- `packages/vscode-hive/package.json` - Add command definition

**Files to create:**
- `packages/vscode-hive/src/commands/initNest.ts` - Command implementation

**initNest.ts** implementation:
```typescript
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// Templates embedded or loaded from hive-core
import { getSkillTemplate, getCopilotAgentTemplate } from '../templates';

export async function initNest(projectRoot: string): Promise<void> {
  // 1. Create .hive structure
  const hivePath = path.join(projectRoot, '.hive');
  fs.mkdirSync(path.join(hivePath, 'features'), { recursive: true });
  fs.mkdirSync(path.join(hivePath, 'skills'), { recursive: true });

  // 2. Create OpenCode skills
  const opencodePath = path.join(projectRoot, '.opencode', 'skill');
  createSkill(opencodePath, 'hive-workflow');
  createSkill(opencodePath, 'hive-execution');
  createSkill(opencodePath, 'hive-planning');

  // 3. Create Claude skills (same format)
  const claudePath = path.join(projectRoot, '.claude', 'skills');
  createSkill(claudePath, 'hive-workflow');
  createSkill(claudePath, 'hive-execution');
  createSkill(claudePath, 'hive-planning');

  // 4. Create Copilot agent
  const agentPath = path.join(projectRoot, '.github', 'agents');
  fs.mkdirSync(agentPath, { recursive: true });
  fs.writeFileSync(
    path.join(agentPath, 'Hive.agent.md'),
    getCopilotAgentTemplate()
  );

  vscode.window.showInformationMessage('🐝 Hive Nest initialized!');
}

function createSkill(basePath: string, skillName: string): void {
  const skillPath = path.join(basePath, skillName);
  fs.mkdirSync(skillPath, { recursive: true });
  fs.writeFileSync(
    path.join(skillPath, 'SKILL.md'),
    getSkillTemplate(skillName)
  );
}
```

**package.json** additions:
```json
{
  "commands": [
    {
      "command": "hive.initNest",
      "title": "Init Hive Nest",
      "category": "Hive"
    }
  ]
}
```

**Verification:**
- Command appears in command palette
- Running it creates all directories
- All skill files have correct content
- `bun run build` succeeds

---

### 3. Add sidebar button for Init Nest

**Goal**: Add "Init Hive Nest" button to sidebar when .hive doesn't exist

**Files to modify:**
- `packages/vscode-hive/src/views/HiveSidebarProvider.ts` (or create)
- `packages/vscode-hive/package.json` - Add view contribution

**Design:**
- When `.hive/` doesn't exist: Show "Init Hive Nest" button
- When `.hive/` exists: Show feature list (existing dashboard)

**Implementation approach:**
- Add welcome view with button when no .hive
- Button calls `hive.initNest` command

**package.json** view contribution:
```json
{
  "views": {
    "hive": [
      {
        "id": "hive.welcome",
        "name": "Hive",
        "when": "!hive.hasHiveRoot"
      },
      {
        "id": "hive.features",
        "name": "Features",
        "when": "hive.hasHiveRoot"
      }
    ]
  },
  "viewsWelcome": [
    {
      "view": "hive.welcome",
      "contents": "No Hive nest found in this workspace.\n[Init Hive Nest](command:hive.initNest)\nThis will create configuration for OpenCode, GitHub Copilot, and Claude."
    }
  ]
}
```

**Verification:**
- Open project without `.hive/`
- Sidebar shows "Init Hive Nest" button
- Clicking it runs the command
- After init, sidebar switches to features view

---

### 4. Port hive_skill tool from PR #6 to opencode-hive

**Goal**: Add skill discovery tool to opencode-hive with updated implementation

**Files to modify:**
- `packages/opencode-hive/src/index.ts` - Add hive_skill tool

**Implementation** (adapted from PR #6):
```typescript
interface HiveSkill {
  name: string;
  description: string;
  path: string;
  body: string;
}

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

function discoverHiveSkills(projectRoot: string): HiveSkill[] {
  const skills: HiveSkill[] = [];
  
  // Check multiple skill locations
  const skillPaths = [
    path.join(projectRoot, '.hive', 'skills'),
    path.join(projectRoot, '.opencode', 'skill'),
    path.join(projectRoot, '.claude', 'skills'),
  ];
  
  for (const skillsDir of skillPaths) {
    if (!fs.existsSync(skillsDir)) continue;
    
    for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      
      const skillPath = path.join(skillsDir, entry.name, 'SKILL.md');
      if (!fs.existsSync(skillPath)) continue;
      
      const content = fs.readFileSync(skillPath, 'utf-8');
      const { frontmatter, body } = parseFrontmatter(content);
      
      skills.push({
        name: frontmatter.name || entry.name,
        description: frontmatter.description || '',
        path: skillPath,
        body
      });
    }
  }
  
  return skills;
}

// Add to tools array:
{
  name: 'hive_skill',
  description: `Load a Hive skill.\n\n<available_skills>\n${formatSkillsList()}\n</available_skills>`,
  inputSchema: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Skill name to load' }
    },
    required: ['name']
  },
  execute: async ({ name }) => {
    const skills = discoverHiveSkills(projectRoot);
    const skill = skills.find(s => s.name === name);
    if (!skill) {
      return { error: `Skill not found: ${name}. Available: ${skills.map(s => s.name).join(', ')}` };
    }
    return { content: skill.body };
  }
}
```

**Verification:**
- `bun run build` succeeds
- Tool appears in OpenCode tools list
- Can discover skills from all 3 locations
- Returns skill content when called

---

### 5. Update Hive.agent.md with skill references

**Goal**: Update the Copilot agent file to reference skills

**File to modify:**
- `.github/agents/Hive.agent.md`

**Changes:**
- Add note about loading skills for detailed instructions
- Keep tool list current
- Improve workflow documentation

**Verification:**
- Agent file has updated content
- Copilot can invoke agent
- Skills are discoverable

---

### 6. Build and verify all packages

**Goal**: Ensure everything builds and works together

**Commands:**
```bash
cd packages/hive-core && bun run build
cd packages/opencode-hive && bun run build
cd packages/vscode-hive && bun run build
```

**Manual verification:**
- Open VS Code in test project
- Run "Init Hive Nest" command
- Verify all files created:
  - `.hive/features/`
  - `.hive/skills/`
  - `.opencode/skill/hive-workflow/SKILL.md`
  - `.opencode/skill/hive-execution/SKILL.md`
  - `.opencode/skill/hive-planning/SKILL.md`
  - `.claude/skills/hive-workflow/SKILL.md`
  - `.claude/skills/hive-execution/SKILL.md`
  - `.claude/skills/hive-planning/SKILL.md`
  - `.github/agents/Hive.agent.md`

---

## Context References

- **PR #6**: Contains hive_skill implementation and hive-execution skill (294 lines)
- **docs/GITHUB-COPILOT-GUIDE.md**: Copilot agent format reference
- **Anthropic skills repo**: SKILL.md format reference
- **OpenCode docs**: Skill path `.opencode/skill/<name>/SKILL.md`
