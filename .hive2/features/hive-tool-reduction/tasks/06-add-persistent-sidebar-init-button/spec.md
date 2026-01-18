# Task 6: Add Persistent Sidebar Init Button

**Feature:** hive-tool-reduction
**Folder:** 06-add-persistent-sidebar-init-button
**Status:** pending

---

## Description

Add **always-visible** "Install Skills" button in sidebar header, plus welcome content for new users.

**MODIFY** `packages/vscode-hive/package.json`:

Add command:
```json
{
  "command": "hive.initSkills",
  "title": "Install Hive Skills",
  "icon": "$(tools)"
}
```

Add view/title menu (persistent button):
```json
"menus": {
  "view/title": [
    {
      "command": "hive.initSkills",
      "when": "view == hive-features",
      "group": "navigation"
    }
  ]
}
```

Add viewsWelcome (for new users):
```json
"viewsWelcome": [
  {
    "view": "hive-features",
    "contents": "Welcome to Hive!\n\n[🐝 Initialize Workspace](command:hive.initNest)\n\nThis creates .hive/ and installs AI skills.",
    "when": "!hive.initialized"
  }
]
```

**CREATE** `packages/vscode-hive/src/commands/initSkills.ts`:
- Extract skill installation from `initNest.ts`
- Can run anytime, overwrites existing skills
- Shows picker: "Select AI tools to install skills for"
  - [ ] OpenCode
  - [ ] Claude
  - [ ] GitHub Copilot
  - [ ] All

**MODIFY** `packages/vscode-hive/src/extension.ts`:
- Register `hive.initSkills` command
- Set `hive.initialized` context key

**Commit**: `hive: add persistent Install Skills button to sidebar`

---

---

## Prior Tasks

- **1. Dependency Audit** (01-dependency-audit)
- **2. Delete SubtaskService and Subtask Tools** (02-delete-subtaskservice-and-subtask-tools)
- **3. Rename session_open to hive_status, Delete SessionService** (03-rename-sessionopen-to-hivestatus-delete-sessionservice)
- **4. Delete context_read and context_list Tools** (04-delete-contextread-and-contextlist-tools)
- **5. Update VSCode Sidebar Tree** (05-update-vscode-sidebar-tree)

---

## Upcoming Tasks

- **7. Enhance hive_status for OmO Consumption** (07-enhance-hivestatus-for-omo-consumption)
- **8. Update hive_tasks_sync for Dual Format Support** (08-update-hivetaskssync-for-dual-format-support)
- **9. Update Skill Templates** (09-update-skill-templates)
- **10. Update Documentation** (10-update-documentation)
