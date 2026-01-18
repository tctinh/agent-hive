# Task: 05-update-vscode-extension

## Feature: hive-tui-standalone-tool-refactor

## Completed Tasks

- 01-fix-comment-editor-visibility: Fixed comment editor visibility by passing accessor instead of value:
- Changed `text` prop type from `string` to `Accessor<string>`
- Component now calls `props.text()` to get reactive updates
- Added blinking cursor indicator (`_`)
- Improved styling with fg="white" for input text
- 02-fix-line-number-and-text-alignment: Fixed line number and text alignment in PlanLine component:
- Changed separator from emoji (💬/│) to ASCII characters (* / |) for consistent width
- Added trailing space to line number for proper spacing: "  1 | text"
- Fixed comment indentation to 6 spaces to align with line content
- Changed comment prefix from emoji to ">>" for consistent rendering
- 03-create-standalone-hivetui-tool: Updated hive_tui tool to use new single-purpose TUIs:
- Added `mode` parameter: 'plan' | 'tasks' (required)
- 'plan' mode launches Plan Viewer TUI
- 'tasks' mode launches Task Tracker TUI
- Updated keyboard shortcut hints for each mode
- Changed pane width from 60 to 70 columns
- 04-remove-showtui-from-existing-tools: Removed show_tui parameter from hive_plan_read and hive_status:
- Removed show_tui arg from both tools
- Removed TUI spawn logic from both tools
- Cleaned up the inlined dynamic import
- Users should now use hive_tui(mode, feature) to launch TUIs explicitly

