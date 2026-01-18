# Task 7: Enhance hive_status for OmO Consumption

**Feature:** hive-tool-reduction
**Folder:** 07-enhance-hivestatus-for-omo-consumption
**Status:** pending

---

## Description

Return JSON instead of markdown.

**Interface** (keep as-is):
```typescript
interface SessionRefreshResult {
  feature: string;
  phase: 'planning' | 'approved' | 'executing' | 'done';
  planSummary: string | null;
  tasks: Array<{ name: string; status: string; folder: string }>;
  progress: { total: number; done: number; inProgress: number; pending: number };
  contextFiles: string[];
  warnings: string[];
  tips: string[];
}
```

**MODIFY** `packages/vscode-hive/src/tools/session.ts`:
- Return `JSON.stringify(result, null, 2)` instead of markdown

**Commit**: `hive: make status output OmO-friendly JSON`

---

---

## Prior Tasks

- **1. Dependency Audit** (01-dependency-audit)
- **2. Delete SubtaskService and Subtask Tools** (02-delete-subtaskservice-and-subtask-tools)
- **3. Rename session_open to hive_status, Delete SessionService** (03-rename-sessionopen-to-hivestatus-delete-sessionservice)
- **4. Delete context_read and context_list Tools** (04-delete-contextread-and-contextlist-tools)
- **5. Update VSCode Sidebar Tree** (05-update-vscode-sidebar-tree)
- **6. Add Persistent Sidebar Init Button** (06-add-persistent-sidebar-init-button)

---

## Upcoming Tasks

- **8. Update hive_tasks_sync for Dual Format Support** (08-update-hivetaskssync-for-dual-format-support)
- **9. Update Skill Templates** (09-update-skill-templates)
- **10. Update Documentation** (10-update-documentation)
