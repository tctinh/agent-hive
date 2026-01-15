---
name: hive-planning
description: Write effective Hive plans with proper task breakdown and context gathering. Use before writing any plan.
---

# Hive Planning

Write effective plans that humans can review and agents can execute.

## When to Use This Skill

- Starting a new feature
- Breaking down complex requirements
- Before calling `hive_plan_write`

## Planning Process

### Step 1: Understand the Request

Before writing anything:
1. Parse what the user explicitly asked for
2. Identify implicit requirements
3. Note any ambiguities that need clarification

### Step 2: Research the Codebase

Use tools to understand existing patterns:

```
# Search for relevant files
grep for keywords, patterns

# Read existing implementations
Read similar features

# Check for conventions
Look at recent commits, existing code style
```

Save all findings:
```
hive_context_write({
  name: "research",
  content: `# Research Findings

## Existing Patterns
- Theme system uses CSS variables in src/theme/
- Components follow atomic design in src/components/

## Files to Modify
- src/theme/colors.ts
- src/components/ThemeProvider.tsx

## Dependencies
- No new dependencies needed
`
})
```

### Step 3: Design the Solution

Before writing tasks, decide:
1. **Approach**: How will you solve this?
2. **Scope**: What's in vs out?
3. **Order**: What depends on what?

Save key decisions:
```
hive_context_write({
  name: "decisions",
  content: `# Design Decisions

## Approach
Using CSS variables for theme switching because:
- Already used in codebase
- No runtime JS needed
- Easy to extend

## Scope
IN: Dark mode toggle, color variables, component updates
OUT: User preference persistence (separate feature)
`
})
```

### Step 4: Write the Plan

Structure your plan with clear task breakdown:

```markdown
# Feature Name

## Overview
One paragraph explaining what we're building and why.
Include any key decisions or constraints.

## Tasks

### 1. Task Name (short, action-oriented)
Clear description of what this task accomplishes.
- Specific file or area to modify
- Expected outcome
- Any dependencies on other tasks

### 2. Another Task
Description...

### 3. Final Task
Description...
```

## Task Design Guidelines

### Good Tasks

| Characteristic | Example |
|---------------|---------|
| **Atomic** | "Add ThemeContext provider" not "Add theming" |
| **Testable** | "Toggle switches between light/dark" |
| **Independent** | Can be completed without other tasks (where possible) |
| **Ordered** | Dependencies come first |

### Task Sizing

- **Too small**: "Add import statement" - combine with related work
- **Too large**: "Implement entire feature" - break into logical units
- **Just right**: "Create theme context with light/dark values"

### Dependency Handling

Mark dependencies explicitly in task descriptions:

```markdown
### 3. Update Button component for theming
Depends on Task 1 (ThemeContext must exist).
- Consume theme from context
- Replace hardcoded colors with theme values
```

## Plan Format for Tasks Sync

`hive_tasks_sync` parses `### N. Task Name` headers.

**Required format:**
```markdown
### 1. Create shared utilities
### 2. Add authentication service
### 3. Update API routes
```

**What gets parsed:**
- `1` becomes task folder prefix: `01-create-shared-utilities`
- Task name is slugified for folder name

## Common Patterns

### Feature Addition
```markdown
## Tasks
### 1. Create core module/component
### 2. Add supporting utilities
### 3. Integrate with existing code
### 4. Add tests
### 5. Update documentation
```

### Refactoring
```markdown
## Tasks
### 1. Add new implementation alongside old
### 2. Migrate consumers one by one
### 3. Remove old implementation
### 4. Clean up unused code
```

### Bug Fix
```markdown
## Tasks
### 1. Add failing test that reproduces bug
### 2. Fix the root cause
### 3. Verify fix and add regression test
```

## Checklist Before Submitting Plan

- [ ] Overview explains the "why"
- [ ] Each task has clear scope
- [ ] Tasks are in dependency order
- [ ] Blockers are identified
- [ ] Context is saved for workers
- [ ] Format follows `### N. Task Name`

## Example Plan

```markdown
# Dark Mode Support

## Overview
Add dark mode toggle to the application. Users can switch between
light and dark themes. Using CSS variables for theming as this
matches our existing color system.

## Tasks

### 1. Create ThemeContext and provider
Add React context for theme state with light/dark values.
- Create src/contexts/ThemeContext.tsx
- Export useTheme hook
- Default to system preference

### 2. Define color tokens for both themes
Create CSS variable definitions for light and dark modes.
- Add src/theme/colors.css with :root and [data-theme="dark"]
- Define semantic color names (background, text, primary, etc.)

### 3. Update core components to use theme tokens
Replace hardcoded colors with CSS variable references.
- Button, Card, Input components
- Navigation and layout components
Depends on Task 2.

### 4. Add theme toggle component
Create toggle switch for theme selection.
- Add src/components/ThemeToggle.tsx
- Wire to ThemeContext
- Add to header/settings
Depends on Task 1.

### 5. Verify and polish
Test theme switching, fix any missed hardcoded colors.
- Manual testing in both modes
- Check contrast ratios
- Fix edge cases
```
