# Task 8: Update hive_tasks_sync for Dual Format Support

**Feature:** hive-tool-reduction
**Folder:** 08-update-hivetaskssync-for-dual-format-support
**Status:** pending

---

## Description

Support both Hive (`### N.`) and Sisyphus (`- [ ] N.`) patterns.

**MODIFY** `packages/hive-core/src/services/taskService.ts`:
```typescript
// Match either format
const hivePattern = /^### (\d+)\. (.+)$/gm;
const sisyphusPattern = /^- \[ \] (\d+)\. (.+)$/gm;
```

**Commit**: `hive: support both Hive and Sisyphus plan formats`

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

---

## Upcoming Tasks

- **9. Update Skill Templates** (09-update-skill-templates)
- **10. Update Documentation** (10-update-documentation)
