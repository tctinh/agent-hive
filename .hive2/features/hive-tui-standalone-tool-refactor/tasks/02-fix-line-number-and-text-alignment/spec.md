# Task: 02-fix-line-number-and-text-alignment

## Feature: hive-tui-standalone-tool-refactor

## Completed Tasks

- 01-fix-comment-editor-visibility: Fixed comment editor visibility by passing accessor instead of value:
- Changed `text` prop type from `string` to `Accessor<string>`
- Component now calls `props.text()` to get reactive updates
- Added blinking cursor indicator (`_`)
- Improved styling with fg="white" for input text

