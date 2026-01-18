# Task 5: Update VSCode Sidebar Tree

**Feature:** hive-tool-reduction
**Folder:** 05-update-vscode-sidebar-tree
**Status:** pending

---

## Description

Remove subtask and session items from tree view.

**MODIFY** `packages/vscode-hive/src/providers/sidebarProvider.ts`:

**DELETE classes**:
- `SubtaskItem`
- `SessionsGroupItem`
- `SessionItem`

**DELETE methods**:
- `getSubtasksFromFolders()`
- `getSessionsData()`
- `getSessions()`

**MODIFY methods**:
- `TaskItem.getChildren()` - Remove subtask return
- `FeatureItem.getChildren()` - Remove SessionsGroupItem

**Commit**: `hive: remove subtask and session from sidebar tree`

---

---

## Prior Tasks

- **1. Dependency Audit** (01-dependency-audit)
- **2. Delete SubtaskService and Subtask Tools** (02-delete-subtaskservice-and-subtask-tools)
- **3. Rename session_open to hive_status, Delete SessionService** (03-rename-sessionopen-to-hivestatus-delete-sessionservice)
- **4. Delete context_read and context_list Tools** (04-delete-contextread-and-contextlist-tools)

---

## Upcoming Tasks

- **6. Add Persistent Sidebar Init Button** (06-add-persistent-sidebar-init-button)
- **7. Enhance hive_status for OmO Consumption** (07-enhance-hivestatus-for-omo-consumption)
- **8. Update hive_tasks_sync for Dual Format Support** (08-update-hivetaskssync-for-dual-format-support)
- **9. Update Skill Templates** (09-update-skill-templates)
- **10. Update Documentation** (10-update-documentation)
