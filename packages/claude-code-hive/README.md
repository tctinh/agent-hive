# claude-code-hive

Static Claude Code plugin assets for Agent Hive.

This package ships the Claude-facing plugin manifest, agents, commands, hooks, and generated skills. The MCP runtime (`@tctinh/agent-hive-mcp`) is fetched on demand by `npx` — not a direct dependency of this package.

## Install (marketplace — recommended)

From Claude Code:

```
/plugin marketplace add tctinh/agent-hive
/plugin install hive@agent-hive
```

The plugin's `mcpServers.hive` entry runs `npx -y -p @tctinh/agent-hive-mcp@latest hive-mcp`, so there is nothing else to install. The first `/hive` invocation may pause briefly while npx caches the package.

## Local Development

From this repository checkout:

```bash
cd packages/claude-code-hive
npm run build
```

That regenerates the packaged skills and verifies the `.claude-plugin/plugin.json` manifest against the plugin contract. Use `npm test` to run the same check on its own.
