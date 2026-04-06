# Agent Hive + GitHub Copilot Guide

This guide teaches you how to create a Hive agent for GitHub Copilot. Just install the extension, create the agent file, and you're ready to go.

## Quick Start

### 1. Install the Extension

```bash
code --install-extension tctinh.vscode-hive
```

Or search "Agent Hive" in VS Code Extensions.

### 2. Create Your Agent

Create `.github/agents/Hive.agent.md` in your repository:

```markdown
---
description: 'Plan-first feature development with isolated worktrees and persistent context.'
tools: ['runSubagent', 'tctinh.vscode-hive/hiveFeatureCreate', 'tctinh.vscode-hive/hiveFeatureList', 'tctinh.vscode-hive/hiveFeatureComplete', 'tctinh.vscode-hive/hivePlanWrite', 'tctinh.vscode-hive/hivePlanRead', 'tctinh.vscode-hive/hivePlanApprove', 'tctinh.vscode-hive/hiveTasksSync', 'tctinh.vscode-hive/hiveTaskCreate', 'tctinh.vscode-hive/hiveTaskUpdate', 'tctinh.vscode-hive/hiveExecStart', 'tctinh.vscode-hive/hiveExecComplete', 'tctinh.vscode-hive/hiveExecAbort', 'tctinh.vscode-hive/hiveMerge', 'tctinh.vscode-hive/hiveWorktreeList', 'tctinh.vscode-hive/hiveContextWrite', 'tctinh.vscode-hive/hiveStatus']
---

# Hive Agent

You are a plan-first development orchestrator.

## Workflow: Plan → Review → Approve → Execute → Merge

... (your agent instructions here)
```

### 3. Use Your Agent

In Copilot Chat, invoke your agent:

```
@Hive I want to add user authentication
```

That's it. Copilot will use your Hive agent with all the tools.

## Understanding the Agent File

### Frontmatter

```yaml
---
description: 'What this agent does - shown in Copilot UI'
tools: ['tool1', 'tool2', ...]
---
```

- **description**: Brief explanation shown when selecting agents
- **tools**: List of tools the agent can use

### Tool Naming

Tools are registered as `tctinh.vscode-hive/hiveFeatureCreate`, but in your agent instructions, just use `featureCreate` - Copilot understands both.

```markdown
# In frontmatter (full path required):
tools: ['tctinh.vscode-hive/hiveFeatureCreate', ...]

# In instructions (short name works):
Call featureCreate({ name: "my-feature" })
```

## Available Tools

The VS Code extension provides these tools for GitHub Copilot:

| Domain | Tools | Description |
|--------|-------|-------------|
| **Feature** | `featureCreate`, `featureList`, `featureComplete` | Create and manage features |
| **Plan** | `planWrite`, `planRead`, `planApprove` | Write and review plans |
| **Task** | `tasksSync`, `taskCreate`, `taskUpdate` | Generate and manage tasks |
| **Exec** | `execStart`, `execComplete`, `execAbort` | Work in isolated worktrees |
| **Merge** | `merge`, `worktreeList` | Integrate completed work |
| **Context** | `contextWrite` | Persistent knowledge |
| **Status** | `status` | Get comprehensive feature status |

## Parallel Execution with runSubagent

GitHub Copilot provides `#tool:runSubagent` for delegating tasks to sub-agents. Each sub-agent runs in isolation with its own context.

### Enable It

Add `runSubagent` to your tools list:

```yaml
tools: ['runSubagent', 'tctinh.vscode-hive/hiveExecStart', ...]
```

### Use It

In your agent instructions, teach it to delegate:

```markdown
## Parallel Execution

Use #tool:runSubagent to delegate tasks:

Use #tool:runSubagent to execute task "2-add-token-refresh":
- Call execStart for the task
- Read context files from .hive/features/<name>/context/
- Implement the feature
- Call execComplete with summary
- Do NOT call merge
```

### Parallel Tasks Example

```markdown
Execute in parallel using #tool:runSubagent for each:

1. Task "2-add-token-refresh": Implement refresh rotation
2. Task "3-update-api-routes": Convert to AuthService

Each sub-agent:
- execStart for their task
- Read context files from .hive/
- Do implementation
- execComplete with summary
- NOT merge (orchestrator decides)
```

### How runSubagent Works

- Sub-agents run independently with their own context
- They don't see the main chat history
- Only the final result returns to main context
- Single-level only (sub-agents can't spawn sub-agents)

## Writing Good Agent Instructions

### 1. Define the Workflow

```markdown
## Workflow

Plan → Review → Approve → Execute → Merge
```

### 2. Explain Each Phase

```markdown
## Phase 1: Planning

1. featureCreate({ name: "feature-name" })
2. Research codebase
3. contextWrite to save findings
4. planWrite with numbered tasks
5. User reviews, planRead to check comments
6. Iterate until approved
```

### 3. Set Clear Rules

```markdown
## Rules

1. Never skip planning
2. Always save context - sub-agents depend on it
3. Complete ≠ Merge - execComplete commits, merge integrates
4. Wait for approval before executing
```

### 4. Show Examples

```markdown
## Example

User: "Add dark mode"

1. featureCreate({ name: "dark-mode" })
2. Research theme files
3. contextWrite findings
4. planWrite with tasks
5. User reviews and approves
6. tasksSync, then execute each task
7. merge completed tasks
8. featureComplete
```

## Complete Example Agent

See the full reference implementation:
[.github/agents/Hive.agent.md](/.github/agents/Hive.agent.md)

Copy this file to your repository and customize as needed.

## Troubleshooting

### Agent Not Appearing

- Ensure file is at `.github/agents/YourAgent.agent.md`
- Check YAML frontmatter syntax (must have `---` delimiters)
- Reload VS Code window

### Tools Not Working

- Verify Agent Hive extension is installed
- Check tool names use full path in frontmatter: `tctinh.vscode-hive/hiveFeatureCreate`
- Run "Developer: Reload Window" in VS Code

### Sub-agents Can't Access Tools

- Ensure `runSubagent` is in your tools list
- Sub-agents inherit tools from the parent agent automatically

## Tips

1. **Context is King** - Save context continuously with `contextWrite`. Sub-agents work blind without it.

   `context/overview.md` is the primary human-facing summary/history file for the branch, while `plan.md` remains the execution source of truth.

2. **Plan Format Matters** - Use `### N. Task Name` headers for `tasksSync` to parse correctly.

3. **Don't Skip Review** - The plan review step catches issues early. Use `planRead` to check for user comments.

4. **Worktrees Persist** - They stay after `execComplete` until you manually remove them, allowing review before merge.
