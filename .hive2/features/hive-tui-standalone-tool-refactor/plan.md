# Hive TUI Standalone Tool Refactor

## Overview
Fix TUI rendering issues and create a dedicated `hive_tui` tool instead of embedding `show_tui` in existing tools.

**Problems identified:**
1. Plan Viewer: Cannot see text being typed in comment editor
2. Line numbers and text not rendering correctly (alignment issues)
3. `show_tui` param on `hive_plan_read`/`hive_status` is bad UX - pops up TUI unexpectedly

**Solution:**
- Create standalone `hive_tui` tool for explicit TUI launching
- Remove `show_tui` from existing tools
- Fix comment editor visibility
- Fix line number/text alignment

## Tasks

### 1. Fix Comment Editor Visibility
The comment editor input is not showing typed text. Fix the `CommentEditor` component to properly display the input text and cursor.

### 2. Fix Line Number and Text Alignment
The plan viewer has rendering issues with line numbers and text alignment. Fix the `PlanLine` component layout.

### 3. Create Standalone hive_tui Tool
Create a new `hive_tui` tool in opencode-hive that:
- Takes `mode` param: 'plan' | 'tasks'
- Takes `feature` param
- Spawns the appropriate TUI in tmux pane
- Returns manual command if not in tmux

### 4. Remove show_tui from Existing Tools
Remove the `show_tui` parameter from `hive_plan_read` and `hive_status` tools. Clean up the inlined `spawnTuiPane` helper if no longer needed.

### 5. Update VSCode Extension
Remove `show_tui` from VSCode tools as well for consistency.
