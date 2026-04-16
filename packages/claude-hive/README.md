# Claude Hive

`claude-hive` is the Claude Code plugin package for Agent Hive.

The package builds a self-contained Claude plugin artifact for local development with `claude --plugin-dir`. The MVP architecture is Claude-native: root-level plugin assets plus a bundled local runtime, with Hive stateful operations intended to flow through a stdio MCP bridge backed by `hive-core`.

## Current Scope

- Build a plugin artifact under `dist/plugin`
- Keep the plugin self-contained for local `--plugin-dir` testing
- Reuse `hive-core` as the execution layer for future MCP-backed Hive operations

## Build

```bash
bun run --filter claude-hive build
```

After build, the local plugin directory is:

```bash
packages/claude-hive/dist/plugin
```

## Local Testing

```bash
claude --plugin-dir ./packages/claude-hive/dist/plugin
```

The scaffolded artifact currently provides the plugin shell and bundled runtime entrypoints. Subsequent tasks add the Hive MCP bridge, commands, skills, agents, and hooks.