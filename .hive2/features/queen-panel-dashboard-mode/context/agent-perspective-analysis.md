# Agent Perspective Analysis

## What Hive Solves

| Limitation | How Hive Helps | Status |
|------------|----------------|--------|
| No persistent memory | Context files, plan, specs, reports | ✅ Solved |
| No scope limits | Worktree isolation, task focus | ✅ Solved |
| Can't course-correct | Blocker system, approval gates | ✅ Solved |
| No record of work | Task reports persist | ✅ Solved |
| No structure | Plan with task breakdown | ✅ Solved |
| Can't ask questions | `hive_ask_question` with lock pattern | ✅ Solved |
| Parallel conflicts | Queen orchestrates, workers isolated | ✅ Solved (by design) |
| Quality unknown | Review flow before merge | 🔄 In progress (this feature) |

## Remaining Challenge: Context Window

### The Problem

200k tokens sounds big, but:
- System prompt + tools: 10k
- Files read: 60k
- Tool outputs: 30k
- Conversation: 40k
- Code written: 20k
= 160k consumed, 40k left

Large tasks exhaust context before completion.

### Ideas for Future

| Idea | Description | Effort |
|------|-------------|--------|
| Subtask handoff notes | Each subtask starts fresh with summary of prior work | Low |
| External scratchpad | Write notes to file, not context | Low |
| Context pressure report | Tell agent how much window used | Low |
| Lazy context loading | Load context files on demand | Medium |
| Smart file reading | LSP-based relevant section extraction | Already available |

### Recommended Additions

1. **hive_scratchpad_write(key, notes)** - External memory
2. **hive_scratchpad_read(key)** - Retrieve without wasting window
3. **Subtask handoff field** - Summary for next subtask to read

These help agent manage long tasks without overflowing context.
