# Simplify Hive: Back to Philosophy

> "Good enough wins. Reject over-engineering." — P4

## Why This Work

We over-engineered. The Queen Panel is a visual dashboard — PHILOSOPHY.md says we're not that. The 24+ tools are wrappers around file operations that agents can do directly. Three skills when one would do.

**The irony**: Hive exists to fight complexity, but we built complexity.

## The Shape

Strip Hive back to its core identity:
- **File-based workflow** — `.hive/` is the interface, not UI panels
- **CLI-first** — OpenCode commands, not VS Code webviews  
- **Minimal skills** — One `hive.md`, not three
- **Context > Tools** — Workers read files, not call wrappers

## Tasks

### 1. Inventory what we have
List all tools and skills. Mark candidates for deprecation. Don't remove yet — let Beekeeper review.

### 2. Remove Queen Panel
Delete the webview, panel code, status bar, keybindings. Keep the sidebar tree (it's lightweight and useful).

### 3. File-based approval marker
Create `.hive/features/<feature>/APPROVED` on approval. Reset it when plan.md changes. Simple file, not status field gymnastics.

### 4. Drop hive_ask
Remove the tool. Workers use OpenCode's `question` tool instead. Keep existing ask files (don't break anything).

### 5. Consolidate skills → hive.md
Merge workflow/execution/planning into one skill. Simpler. CLI-first. Trusts workers.

### 6. Update docs
Align prompts and READMEs with the new reality. Remove Queen Panel mentions. Emphasize file-based flow.

## Parallelization

Tasks 1-5 are independent. Task 6 waits for the others.

## Done When

- No Queen Panel code remains
- One `hive.md` skill
- Plan approval is a file marker
- Docs reflect CLI-first philosophy
- Tests pass

---

*Plan first. Execute with trust. Context persists. Tests verify.*
