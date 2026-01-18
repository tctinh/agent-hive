# Hive Tool Reduction + OmO Integration

## Philosophy: Hive Controls the Chaos

> **"Vibe coding is powerful but chaotic."** — PHILOSOPHY.md

Hive exists to **channel OmO's power responsibly**:
- OmO agents are powerful but can bloat code and lose context
- Hive provides structure that prevents the mess
- Together: power WITH responsibility

### The Layer Model

```
OmO Agents (powerful, autonomous, ephemeral context)
    ↓ constrained by
Hive Structure (approval gates, worktree isolation, file persistence)
    ↓ produces  
Controlled Output (clean commits, audit trail, reproducible)
```

| Layer | Role | Examples |
|-------|------|----------|
| **OmO** | Agent intelligence | Prometheus (planning), Sisyphus (execution), Oracle (reasoning) |
| **Hive** | Structural discipline | Worktree isolation, plan approval, context persistence |

---

## Research Findings

> Full research saved to:
> - `.hive/features/hive-tool-reduction/context/omo-integration-research.md`
> - `.hive/features/hive-tool-reduction/context/init-sidebar-research.md`

### OmO Integration Points

| Point | Discovery | Solution |
|-------|-----------|----------|
| 1. Output format | VSCode has structured data internally | Return JSON directly |
| 2. Context conventions | OmO injects any markdown | Already compatible |
| 3. Plan format | Sisyphus uses `- [ ] N.` checkboxes | Support both patterns |
| 4. Integration hooks | OmO uses system directives | Skip (JSON sufficient) |

### Init Button Requirement

**User requirement**: Button should be **ALWAYS available**, not just for new workspaces.

Use cases:
- Initialize Hive in a new workspace
- Reinstall/update skills after Hive update
- Add skills to a new AI tool
- Fix corrupted skill files

**Solution**: 
1. **View title action** (persistent icon button in sidebar header)
2. **Welcome content** (for first-time users when no .hive)

---

## Tool Changes Summary

### Remove (8 tools)

| Tool | Reason |
|------|--------|
| `hive_subtask_create` | OmO's todo system handles granular tracking |
| `hive_subtask_update` | Same |
| `hive_subtask_list` | Same |
| `hive_subtask_spec_write` | Agent writes specs as markdown directly |
| `hive_subtask_report_write` | Agent writes reports as markdown directly |
| `hive_session_list` | OmO tracks sessions; Hive tracks files |
| `hive_context_read` | Agent uses Read tool directly |
| `hive_context_list` | Agent uses `hive_status` for overview |

### Rename (1 tool)

| Before | After | Reason |
|--------|-------|--------|
| `hive_session_open` | `hive_status` | Reflects purpose: aggregated status |

### Keep (18 tools)

| Category | Tools | Count |
|----------|-------|-------|
| Feature | create, list, complete | 3 |
| Plan | write, read, approve | 3 |
| Task | sync, create, update | 3 |
| Exec | start, complete, abort | 3 |
| Merge | merge, worktree_list | 2 |
| Context | write | 1 |
| Session | status (renamed) | 1 |
| **Total** | | **18** |

---

## Tasks

### 1. Dependency Audit

Audit all usages before deletion.

**Actions**:
- `lsp_find_references` on SubtaskService, SessionService
- `ast_grep_search` for tool name patterns
- Document all usages

**Files to audit**:
- `packages/hive-core/src/services/subtaskService.ts`
- `packages/hive-core/src/services/sessionService.ts`
- `packages/hive-core/src/services/index.ts`
- `packages/vscode-hive/src/tools/index.ts`
- `packages/opencode-hive/src/index.ts`

**No commit** - audit only.

---

### 2. Delete SubtaskService and Subtask Tools

Remove the entire subtask system (5 tools).

**Files to DELETE**:
- `packages/hive-core/src/services/subtaskService.ts`
- `packages/vscode-hive/src/tools/subtask.ts`

**Files to MODIFY**:
- `packages/hive-core/src/services/index.ts` - Remove export
- `packages/vscode-hive/src/tools/index.ts` - Remove export
- `packages/opencode-hive/src/index.ts` - Remove 5 tool definitions

**Commit**: `hive: remove subtask system (5 tools)`

---

### 3. Rename session_open to hive_status, Delete SessionService

**VS Code** (`packages/vscode-hive/src/tools/session.ts`):
- Rename tool to `hiveStatus`

**DELETE**:
- `packages/hive-core/src/services/sessionService.ts`

**MODIFY**:
- `packages/hive-core/src/services/index.ts` - Remove export
- `packages/opencode-hive/src/index.ts` - Rename tool, delete session_list

**Commit**: `hive: rename session_open to status, delete SessionService`

---

### 4. Delete context_read and context_list Tools

**MODIFY** `packages/vscode-hive/src/tools/context.ts`:
- Remove `hive_context_read` and `hive_context_list`
- Keep `hive_context_write`

**MODIFY** `packages/hive-core/src/services/contextService.ts`:
- Remove `read()` method
- Keep `list()` for internal use

**MODIFY** `packages/opencode-hive/src/index.ts`:
- Remove tool definitions

**Commit**: `hive: remove context_read and context_list tools`

---

### 5. Update VSCode Sidebar Tree

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

### 6. Add Persistent Sidebar Init Button

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

### 7. Enhance hive_status for OmO Consumption

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

### 8. Update hive_tasks_sync for Dual Format Support

Support both Hive (`### N.`) and Sisyphus (`- [ ] N.`) patterns.

**MODIFY** `packages/hive-core/src/services/taskService.ts`:
```typescript
// Match either format
const hivePattern = /^### (\d+)\. (.+)$/gm;
const sisyphusPattern = /^- \[ \] (\d+)\. (.+)$/gm;
```

**Commit**: `hive: support both Hive and Sisyphus plan formats`

---

### 9. Update Skill Templates

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

### 10. Update Documentation

**Tool counts**:
- `README.md`: → 18 tools
- `packages/vscode-hive/README.md`: → 18 tools
- `packages/opencode-hive/src/index.ts`: → 18 tools

**MODIFY** `packages/opencode-hive/docs/HIVE-TOOLS.md`:
- Remove deleted tools
- Add `hive_status`

**ADD to README.md**:
```markdown
## OmO Integration

Hive works seamlessly with Oh-My-OpenCode agents:
- **Prometheus** writes plans → `hive_tasks_sync` parses
- **Sisyphus** uses `hive_exec_*` → worktree isolation
- **Any agent** uses `hive_context_write` → persistent memory
- **`hive_status`** returns JSON → agents consume directly
```

**Commit**: `docs: update for 18 tools and OmO integration`

---

## Task Dependencies

```
Task 1 (Audit) 
    ↓
Task 2 (Delete subtasks) ──┐
Task 3 (Rename session)  ──┼── Parallel
Task 4 (Delete context)  ──┤
Task 6 (Init button)     ──┘
    ↓
Task 5 (Sidebar tree) ←─── Depends on 2, 3
Task 7 (JSON status) ←──── Depends on 3
Task 8 (Dual format) ←──── Independent
    ↓
Task 9 (Templates) ←────── Depends on 2, 3, 4, 6
Task 10 (Docs) ←────────── Depends on all
```

| Batch | Tasks | Parallelizable |
|-------|-------|----------------|
| 1 | 1 | No |
| 2 | 2, 3, 4, 6 | Yes |
| 3 | 5, 7, 8 | Yes |
| 4 | 9, 10 | Sequential |

---

## Success Criteria

### Verification Commands

```bash
# Build
bun run build

# Test
bun test

# Tool count
grep -c "name: 'hive_" packages/opencode-hive/src/index.ts
# Expected: 18

# No subtask references
grep -r "subtask" packages/*/src --include="*.ts" | grep -v test | wc -l
# Expected: 0

# No SessionService
grep -r "SessionService" packages/*/src --include="*.ts" | wc -l
# Expected: 0

# Init button exists
grep "hive.initSkills" packages/vscode-hive/package.json
# Expected: match

# View title menu
grep "view/title" packages/vscode-hive/package.json
# Expected: match
```

### Final Checklist

- [ ] 8 tools removed
- [ ] 1 tool renamed (session_open → status)
- [ ] `hive_status` returns JSON
- [ ] `hive_tasks_sync` parses both formats
- [ ] Sidebar tree: no subtasks/sessions
- [ ] Sidebar header: persistent "Install Skills" button
- [ ] Welcome content for new workspaces
- [ ] `hive.initSkills` command registered
- [ ] Skill picker UI (OpenCode/Claude/Copilot/All)
- [ ] All templates updated (18 tools)
- [ ] All docs updated
- [ ] Builds pass
- [ ] Tests pass
