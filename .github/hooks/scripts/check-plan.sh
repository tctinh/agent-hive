#!/usr/bin/env bash
set -e

shopt -s nullglob

input_json="$(</dev/stdin)"
tool_name="$(jq -r '(.toolName // .tool?.name // .tool_name // .name // .tool // empty) | strings' <<<"$input_json")"

if [[ "$tool_name" != 'edit' && "$tool_name" != 'editFiles' && "$tool_name" != 'execute' ]]; then
  exit 0
fi

has_approved_plan=false

for feature_json in .hive/features/*/feature.json; do
  status="$(jq -r '.status // empty' "$feature_json")"
  if [[ "$status" == 'approved' || "$status" == 'executing' ]]; then
    has_approved_plan=true
    break
  fi
done

if [[ "$has_approved_plan" == 'true' ]]; then
  exit 0
fi

jq -n '{ permissionDecision: "deny", message: "No approved Hive plan found. Create and approve a plan first." }'
