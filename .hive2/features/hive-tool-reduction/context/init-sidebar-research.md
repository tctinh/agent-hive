# Init & Skill Setup Research

## User Requirement (Updated)

**Init button should be ALWAYS available**, not just when .hive doesn't exist.

Use cases:
- Initialize Hive in a new workspace
- Reinstall/update skills after Hive update
- Add skills to a new AI tool
- Fix corrupted skill files

The button should be a **persistent sidebar action**, not welcome content.

---

## VS Code Sidebar Action Patterns

### Option 1: View Title Actions (Recommended)

In `package.json`:
```json
{
  "contributes": {
    "menus": {
      "view/title": [
        {
          "command": "hive.initSkills",
          "when": "view == hive-features",
          "group": "navigation"
        }
      ]
    }
  }
}
```

This adds an icon button to the sidebar header (next to collapse/refresh).

### Option 2: Tree Item with Action

Add a permanent "Setup" item at the top of the tree:
```typescript
class SetupItem extends vscode.TreeItem {
  constructor() {
    super('🐝 Install Skills', vscode.TreeItemCollapsibleState.None);
    this.command = {
      command: 'hive.initSkills',
      title: 'Install Hive Skills'
    };
    this.tooltip = 'Install/update Hive skills for OpenCode, Claude, Copilot';
  }
}
```

### Option 3: Both Welcome + Persistent

- Welcome content when no .hive (for new users)
- Title action always available (for skill management)

---

## Current initNest Command

`hive.initNest` does:
1. Create `.hive/features/`
2. Create `.hive/skills/`
3. Install OpenCode skill
4. Install Claude skill  
5. Install Copilot agent

**Proposal**: Split into two commands:

| Command | Purpose |
|---------|---------|
| `hive.initNest` | Create .hive structure (first-time setup) |
| `hive.initSkills` | Install/update skills only (can run anytime) |

Or keep as one command that:
- Creates .hive if not exists
- Always updates skills

---

## Skill Installation Locations

| Tool | Path | Template |
|------|------|----------|
| OpenCode | `.opencode/skill/hive/SKILL.md` | hive.md |
| Claude | `.claude/skills/hive/SKILL.md` | hive.md |
| Copilot | `.github/agents/Hive.agent.md` | copilot-agent.md |

---

## Implementation Recommendation

1. **Add view/title action** for persistent "Install Skills" button
2. **Keep welcome content** for first-time user guidance
3. **Single command** that handles both init and skill install
4. **Always overwrite skills** to ensure latest version

```json
{
  "contributes": {
    "commands": [
      {
        "command": "hive.initSkills",
        "title": "Install Hive Skills",
        "icon": "$(tools)"
      }
    ],
    "menus": {
      "view/title": [
        {
          "command": "hive.initSkills",
          "when": "view == hive-features",
          "group": "navigation"
        }
      ]
    },
    "viewsWelcome": [
      {
        "view": "hive-features",
        "contents": "Welcome to Hive!\n\n[🐝 Initialize Workspace](command:hive.initNest)\n\nThis creates .hive/ and installs skills.",
        "when": "!hive.initialized"
      }
    ]
  }
}
```
