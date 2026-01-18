# Task 9: Update Skill Templates

**Feature:** hive-tool-reduction
**Folder:** 09-update-skill-templates
**Status:** pending

---

## Description

Update all skill templates for 18 tools.

**MODIFY** `packages/hive-core/templates/skills/hive.md`:
- Remove subtask tools
- Rename session_open → hive_status
- Update tool count: 18
- Add "OmO Integration" section

**MODIFY** `packages/hive-core/templates/skills/copilot-agent.md`:
- Remove subtask tools
- Update tool list

**MODIFY** `packages/vscode-hive/src/commands/initNest.ts`:
- Update hardcoded templates
- OR: Read from hive-core/templates

**Commit**: `hive: update skill templates for 18 tools`

---

---

## Prior Tasks

- **1. Dependency Audit** (01-dependency-audit)
- **2. Delete SubtaskService and Subtask Tools** (02-delete-subtaskservice-and-subtask-tools)
- **3. Rename session_open to hive_status, Delete SessionService** (03-rename-sessionopen-to-hivestatus-delete-sessionservice)
- **4. Delete context_read and context_list Tools** (04-delete-contextread-and-contextlist-tools)
- **5. Update VSCode Sidebar Tree** (05-update-vscode-sidebar-tree)
- **6. Add Persistent Sidebar Init Button** (06-add-persistent-sidebar-init-button)
- **7. Enhance hive_status for OmO Consumption** (07-enhance-hivestatus-for-omo-consumption)
- **8. Update hive_tasks_sync for Dual Format Support** (08-update-hivetaskssync-for-dual-format-support)

---

## Upcoming Tasks

- **10. Update Documentation** (10-update-documentation)
