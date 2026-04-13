#!/bin/bash
# Hive SessionStart hook: inject active feature context into the session.
# Reads .hive/active-feature and collects context files for the active feature.

set -euo pipefail

HIVE_DIR=".hive"
ACTIVE_FILE="$HIVE_DIR/active-feature"

# No active feature → no context to inject
if [ ! -f "$ACTIVE_FILE" ]; then
  echo '{"hookSpecificOutput":{"hookEventName":"SessionStart"}}'
  exit 0
fi

FEATURE=$(cat "$ACTIVE_FILE" | tr -d '[:space:]')
if [ -z "$FEATURE" ]; then
  echo '{"hookSpecificOutput":{"hookEventName":"SessionStart"}}'
  exit 0
fi

FEATURE_DIR="$HIVE_DIR/features/$FEATURE"
if [ ! -d "$FEATURE_DIR" ]; then
  echo '{"hookSpecificOutput":{"hookEventName":"SessionStart"}}'
  exit 0
fi

# Collect context
CONTEXT_PARTS=()
CONTEXT_PARTS+=("Active Hive feature: $FEATURE")

# Feature status
if [ -f "$FEATURE_DIR/feature.json" ]; then
  STATUS=$(python3 -c "import json,sys; print(json.load(sys.stdin).get('status','unknown'))" < "$FEATURE_DIR/feature.json" 2>/dev/null || echo "unknown")
  CONTEXT_PARTS+=("Feature status: $STATUS")
fi

# Plan existence
if [ -f "$FEATURE_DIR/plan.md" ]; then
  CONTEXT_PARTS+=("Plan exists at: $FEATURE_DIR/plan.md")
fi

# Task summary
if [ -d "$FEATURE_DIR/tasks" ]; then
  TASK_COUNT=$(find "$FEATURE_DIR/tasks" -name "status.json" -maxdepth 2 2>/dev/null | wc -l | tr -d '[:space:]')
  if [ "$TASK_COUNT" -gt 0 ]; then
    CONTEXT_PARTS+=("Tasks: $TASK_COUNT task(s) in $FEATURE_DIR/tasks/")
  fi
fi

# Context files
if [ -d "$FEATURE_DIR/context" ]; then
  CTX_COUNT=$(find "$FEATURE_DIR/context" -name "*.md" -maxdepth 1 2>/dev/null | wc -l | tr -d '[:space:]')
  if [ "$CTX_COUNT" -gt 0 ]; then
    CONTEXT_PARTS+=("Context: $CTX_COUNT file(s) in $FEATURE_DIR/context/")
  fi
fi

# Join context parts
ADDITIONAL_CONTEXT=$(printf '%s\n' "${CONTEXT_PARTS[@]}")

# Escape for JSON
ESCAPED_CONTEXT=$(echo "$ADDITIONAL_CONTEXT" | python3 -c "import json,sys; print(json.dumps(sys.stdin.read()))" 2>/dev/null | sed 's/^"//;s/"$//')

cat <<EOF
{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"$ESCAPED_CONTEXT"}}
EOF
