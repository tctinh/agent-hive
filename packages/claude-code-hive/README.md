# claude-code-hive

Static Claude Code plugin assets for Agent Hive.

This package ships the Claude-facing plugin manifest, prompts, hooks, generated skills, and a package-local launcher that resolves the `hive-mcp` runtime package when installed from npm.

## Install

Install `claude-code-hive` and `hive-mcp` into the same Node.js dependency tree so the packaged launcher can resolve the runtime locally:

```bash
mkdir -p .agent-hive/claude
cd .agent-hive/claude
npm init -y
npm install claude-code-hive hive-mcp
```

Then point Claude Code at `node_modules/claude-code-hive/plugin.json`.

## Local Development

From this repository checkout:

```bash
cd packages/claude-code-hive
npm run build
```

That regenerates the packaged skills, prepares the linked `hive-mcp` runtime when needed, and verifies that the checked-in `plugin.json` still resolves through the package-local launcher.