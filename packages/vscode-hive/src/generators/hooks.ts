export interface HookConfig {
  version: 1;
  hooks: Record<string, HookStep[]>;
}

export interface HookStep {
  type: 'command';
  command: { bash: string; powershell?: string };
  cwd?: string;
  env?: Record<string, string>;
  timeoutSec?: number;
  description?: string;
}

interface GeneratedScript {
  filename: string;
  content: string;
}

export interface HookOutput {
  configFilename: string;
  config: HookConfig;
  scripts: GeneratedScript[];
}

function buildScript(body: string): string {
  return `#!/usr/bin/env bash
set -e

${body.trim()}
`;
}

function buildHookOutput(configFilename: string, config: HookConfig, scripts: GeneratedScript[]): HookOutput {
  return {
    configFilename,
    config,
    scripts,
  };
}

export function generatePlanEnforcementHook(): HookOutput {
  const script = buildScript(`shopt -s nullglob

input_json="$(</dev/stdin)"
tool_name="$(jq -r '(.toolName // .tool?.name // .tool_name // .name // .tool // empty) | strings' <<<"$input_json")"

if [[ "$tool_name" != 'editFiles' && "$tool_name" != 'execute' ]]; then
  exit 0
fi

has_approved_plan=false

for feature_json in .hive/features/*/feature.json; do
  if [[ "$(jq -r '.status // empty' "$feature_json")" == 'approved' ]]; then
    has_approved_plan=true
    break
  fi
done

if [[ "$has_approved_plan" == 'true' ]]; then
  exit 0
fi

jq -n '{ permissionDecision: "deny", message: "No approved Hive plan found. Create and approve a plan first." }'
`);

  return buildHookOutput(
    'hive-plan-enforcement.json',
    {
      version: 1,
      hooks: {
        preToolUse: [
          {
            type: 'command',
            command: { bash: '.github/hooks/scripts/check-plan.sh' },
            timeoutSec: 5,
          },
        ],
      },
    },
    [
      {
        filename: 'check-plan.sh',
        content: script,
      },
    ],
  );
}

export function generateContextInjectionHook(): HookOutput {
  const script = buildScript(`shopt -s nullglob

active_feature=''

for feature_json in .hive/features/*/feature.json; do
  status="$(jq -r '.status // empty' "$feature_json")"

  if [[ "$status" != 'completed' ]]; then
    active_feature="\${feature_json%/feature.json}"
    active_feature="\${active_feature##*/}"
    break
  fi
done

if [[ -z "$active_feature" ]]; then
  jq -n '{}'
  exit 0
fi

context_dir=".hive/features/$active_feature/context"

if [[ ! -d "$context_dir" ]]; then
  context_dir=".hive/features/$active_feature/contexts"
fi

if [[ ! -d "$context_dir" ]]; then
  jq -n '{}'
  exit 0
fi

combined_context=''

for context_file in "$context_dir"/*; do
  if [[ ! -f "$context_file" ]]; then
    continue
  fi

  file_name="\${context_file##*/}"
  file_content="$(<"$context_file")"

  if [[ -n "$file_content" ]]; then
    if [[ -n "$combined_context" ]]; then
      combined_context+=$'\n\n'
    fi

    combined_context+="## $file_name"
    combined_context+=$'\n\n'
    combined_context+="$file_content"
  fi
done

if [[ -z "$combined_context" ]]; then
  jq -n '{}'
  exit 0
fi

jq -n --arg additionalContext "$combined_context" '{ additionalContext: $additionalContext }'
`);

  return buildHookOutput(
    'hive-context-injection.json',
    {
      version: 1,
      hooks: {
        sessionStart: [
          {
            type: 'command',
            command: { bash: '.github/hooks/scripts/inject-context.sh' },
            timeoutSec: 10,
          },
        ],
      },
    },
    [
      {
        filename: 'inject-context.sh',
        content: script,
      },
    ],
  );
}

export function generateAllHooks(): HookOutput[] {
  return [generatePlanEnforcementHook(), generateContextInjectionHook()];
}
