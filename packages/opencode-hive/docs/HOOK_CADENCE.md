# Hook Cadence Configuration

## Overview

The hook cadence system allows you to control how frequently OpenCode plugin hooks fire, reducing token consumption by allowing hooks to execute every N turns instead of every turn.

## Motivation

The `experimental.chat.system.transform` hook injects the large `HIVE_SYSTEM_PROMPT` (~80 lines of markdown, ~2KB) into the system prompt on **every single LLM call**. This is the primary source of token waste in agent-hive.

By configuring this hook to fire every 3rd turn instead of every turn, you can reduce token consumption by approximately 66% for this hook while maintaining context freshness.

## Configuration

Add a `hook_cadence` field to your `~/.config/opencode/agent_hive.json`:

```json
{
  "hook_cadence": {
    "experimental.chat.system.transform": 3,
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
| `experimental.chat.system.transform` | Injects HIVE_SYSTEM_PROMPT + feature status hint | 1 | 3-5 (reduces token waste) |
| `chat.message` | Sets agent variant | 1 | 1 (lightweight, keep default) |
| `tool.execute.before` | Docker sandbox command wrapping | 1 | **1 (SAFETY-CRITICAL)** |

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

Assuming `HIVE_SYSTEM_PROMPT` is ~2KB per injection:

| Cadence | Tokens per 10 turns | Savings vs. Default |
|---------|---------------------|---------------------|
| 1 (default) | ~20KB | 0% |
| 3 | ~7KB | **65%** |
| 5 | ~4KB | **80%** |

**Note:** Actual savings depend on conversation length and hook complexity.

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

Each hook uses a cadence gate at the top of its callback:

```typescript
"experimental.chat.system.transform": async (input, output) => {
  // Cadence gate: check if this hook should execute this turn
  if (!shouldExecuteHook("experimental.chat.system.transform")) {
    return;
  }

  // Hook logic only executes if gate passes
  output.system.push(HIVE_SYSTEM_PROMPT);
  // ...
}
```

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
