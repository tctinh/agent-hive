# Hook Cadence Configuration

## Overview

The hook cadence system lets you control how often selected OpenCode plugin hooks fire. In the current runtime contract, cadence applies to supported hooks such as `chat.message` and `experimental.chat.messages.transform`; it does not imply access to unsupported startup or pre-compaction hooks.

The plugin's declared supported runtime surface in this branch is broader than the cadence-tuned subset: `event`, `config`, `chat.message`, `experimental.chat.messages.transform`, `tool.execute.before`, and `tool.execute.after` are all supported hooks. Cadence is only documented here for the hooks where turn gating is an intentional operator control.

## Motivation

Some supported hooks can be useful on every turn, but not all of them need to run at the same cadence. Cadence gives operators a bounded way to trade refresh frequency against token cost without claiming deeper runtime coordination than OpenCode currently exposes.

## Configuration

Add a `hook_cadence` field to your `~/.config/opencode/agent_hive.json`:

```json
{
  "hook_cadence": {
    "experimental.chat.messages.transform": 2,
    "chat.message": 1,
    "tool.execute.before": 1
  }
}
```

### Configuration Schema

- **Key**: The literal OpenCode hook name (string)
- **Value**: Number of turns between hook invocations (integer >= 1)
  - `1` = every turn (default behavior)
  - `3` = every 3rd turn (fires on turns 1, 4, 7, 10, ...)
  - `5` = every 5th turn (fires on turns 1, 6, 11, 16, ...)

### Available Hooks

| Hook Name | Purpose | Default Cadence | Recommended Cadence |
|-----------|---------|-----------------|---------------------|
| `chat.message` | Applies configured agent variant metadata | 1 | 1 |
| `experimental.chat.messages.transform` | Replays bounded post-compaction recovery context when needed | 1 | 1-2 |
| `tool.execute.before` | Docker sandbox command wrapping | 1 | **1 (SAFETY-CRITICAL)** |

`tool.execute.after` is also part of the supported hook surface and is used to bind child session provenance plus parent-session replay selection after `task()` returns, but it is not currently exposed as a cadence-tuned operator knob in this document.

## Behavior

### Turn Counting

- Each hook maintains its own independent turn counter
- Counters start at 0 and increment on every hook invocation
- **Turn 1 always fires** regardless of cadence (ensures context on session start)
- Subsequent turns follow the pattern: fire on turns `1, 1+cadence, 1+2*cadence, ...`

### Examples

**Cadence = 1 (every turn):**
```
Turns:  1  2  3  4  5  6  7  8  9  10
Fires:  ✓  ✓  ✓  ✓  ✓  ✓  ✓  ✓  ✓  ✓
```

**Cadence = 3 (every 3rd turn):**
```
Turns:  1  2  3  4  5  6  7  8  9  10
Fires:  ✓  ✗  ✗  ✓  ✗  ✗  ✓  ✗  ✗  ✓
```

**Cadence = 5 (every 5th turn):**
```
Turns:  1  2  3  4  5  6  7  8  9  10  11  12
Fires:  ✓  ✗  ✗  ✗  ✗  ✓  ✗  ✗  ✗  ✗  ✓   ✗
```

### Edge Case Handling

The system validates all cadence values and falls back to safe defaults:

- **Invalid values** (cadence <= 0, non-integer, null, undefined) → defaults to `1`
- **Malformed config** (invalid JSON) → falls back to all hooks with cadence `1`
- **Missing config file** → all hooks default to cadence `1` (backward compatible)

## Safety-Critical Hooks

### `tool.execute.before`

This hook wraps shell commands for Docker sandbox isolation. **Setting cadence > 1 could allow unsafe commands through.**

The implementation **programmatically enforces cadence=1** for this hook when the `safetyCritical` flag is set, regardless of user configuration.

If you attempt to set `cadence > 1` for this hook, you'll see a warning:

```
[hive:cadence] Ignoring cadence > 1 for safety-critical hook: tool.execute.before
```

## Token Savings Estimation

Savings depend on which supported hooks you gate and how often they would otherwise run. Treat cadence as a small operator knob, not as a replacement for durable `.hive` state or for primary-session todo/checkpoint refresh.

## Backward Compatibility

- **Zero behavior change** when `hook_cadence` is absent from config
- **Zero behavior change** when all cadence values are set to `1`
- Existing configs without `hook_cadence` continue to work as before

## Implementation Details

### ConfigService

The `ConfigService` class provides:

```typescript
getHookCadence(hookName: string, options?: { safetyCritical?: boolean }): number
```

- Returns the configured cadence or `1` if not set
- Validates cadence values (must be integer >= 1)
- Enforces cadence=1 for safety-critical hooks when `safetyCritical: true`

### Plugin Hook Integration

Each supported hook can use a cadence gate at the top of its callback. In this branch, the cadence-tested surfaces are lightweight runtime hooks such as `chat.message` and `experimental.chat.messages.transform`, while `tool.execute.before` stays locked to cadence `1`.

### Turn Counter Logic

```typescript
const shouldExecuteHook = (hookName: string, options?: { safetyCritical?: boolean }): boolean => {
  const cadence = configService.getHookCadence(hookName, options);
  
  // Increment turn counter
  turnCounters[hookName] = (turnCounters[hookName] || 0) + 1;
  const currentTurn = turnCounters[hookName];
  
  // Cadence of 1 means fire every turn (no gating needed)
  if (cadence === 1) {
    return true;
  }
  
  // Fire on turns 1, (1+cadence), (1+2*cadence), ...
  // Using (currentTurn - 1) % cadence === 0 ensures turn 1 always fires
  return (currentTurn - 1) % cadence === 0;
};
```

## Testing

The implementation includes comprehensive unit tests covering:

- Default behavior (no config)
- Various cadence values (1, 3, 5)
- Edge cases (0, negative, non-integer values)
- Safety-critical hook enforcement
- Multiple hooks with independent counters
- Error handling (malformed JSON, missing config)
- Concurrent hook execution

Run tests:
```bash
cd packages/opencode-hive
bun test src/__tests__/hook-cadence.test.ts
```

## Troubleshooting

### Hook not firing as expected

1. Check your config file syntax: `cat ~/.config/opencode/agent_hive.json`
2. Verify the hook name is spelled correctly (case-sensitive)
3. Check console logs for validation warnings: `[hive:cadence]`
4. Ensure cadence value is an integer >= 1

### Recovery wording seems stale

If local docs or prompts still mention unsupported hooks such as `experimental.chat.system.transform` or `experimental.session.compacting`, treat that wording as stale. The supported recovery path in this branch is:

- `session.compacted` event observation
- `session.status` idle observation and `tool.execute.after` task-return handling to mark replay on the parent/orchestrator session when task workers hand control back
- bounded replay through `experimental.chat.messages.transform`
- durable `.hive` task artifacts, with `checkpoint.json` as the primary semantic recovery artifact and `worker-prompt.md` as the re-entry prompt path

### Safety-critical hook warning

If you see:
```
[hive:cadence] Ignoring cadence > 1 for safety-critical hook: tool.execute.before
```

This is expected behavior. The `tool.execute.before` hook must always fire (cadence=1) for security reasons.

### Invalid cadence warning

If you see:
```
[hive:cadence] Invalid cadence <value> for <hook>, using 1
```

Your configured cadence value is invalid (not an integer >= 1). The system falls back to cadence=1.

## Future Enhancements

Potential improvements for future versions:

- **Session reset**: Reset turn counters on conversation/session changes
- **Dynamic cadence**: Adjust cadence based on context size or token budget
- **Per-agent cadence**: Different cadence values for different agents
- **Observability**: Metrics and debugging info for cadence behavior
- **Upstream API support**: If OpenCode later adds stronger lifecycle/todo hooks, Hive can document and adopt them explicitly rather than implying they already exist
