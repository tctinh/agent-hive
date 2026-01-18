# Task 5: Build FeatureSelector

**Feature:** hive-tmux-integration
**Folder:** 05-build-featureselector
**Status:** pending

---

## Description

**src/views/FeatureSelect.tsx:**
- Call `featureService.list()` for all feature names
- For each: `featureService.getInfo(name)` for status/task count
- Arrow navigation with highlight
- Enter to select, updates App state

Display format per row:
```
{icon} {name} ({done}/{total} tasks)
```

Icons by status:
```typescript
const STATUS_ICONS = {
  planning: '📝',
  approved: '✅', 
  executing: '🔄',
  completed: '🏁'
};
```

---

## Prior Tasks

- **1. Create hive-tui package scaffold** (01-create-hive-tui-package-scaffold)
- **2. Build Dashboard view with task list** (02-build-dashboard-view-with-task-list)
- **3. Build PlanViewer with commenting** (03-build-planviewer-with-commenting)
- **4. Build SpecViewer for task specs** (04-build-specviewer-for-task-specs)

---

## Upcoming Tasks

- **6. Add file watcher for real-time updates** (06-add-file-watcher-for-real-time-updates)
- **7. Add tmux utilities and hive_tui tool** (07-add-tmux-utilities-and-hivetui-tool)
- **8. Documentation and build setup** (08-documentation-and-build-setup)
