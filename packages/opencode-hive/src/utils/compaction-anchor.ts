export interface CompactionSessionContext {
  agent?: string;
  baseAgent?: string;
  sessionKind?: 'primary' | 'subagent' | 'task-worker' | 'unknown';
  featureName?: string;
  taskFolder?: string;
  workerPromptPath?: string;
}

export interface CompactionReanchor {
  prompt: string;
  context: string[];
}

const AGENT_ROLE_MAP: Record<string, string> = {
  'hive-master': 'Hive',
  'architect-planner': 'Architect',
  'swarm-orchestrator': 'Swarm',
  'forager-worker': 'Forager',
  'scout-researcher': 'Scout',
  'hygienic-reviewer': 'Hygienic',
};

const BASE_AGENT_ROLE_MAP: Record<string, string> = {
  'forager-worker': 'Forager',
  'hygienic-reviewer': 'Hygienic',
  'scout-researcher': 'Scout',
};

function resolveRole(ctx: CompactionSessionContext): string | undefined {
  if (ctx.agent && AGENT_ROLE_MAP[ctx.agent]) {
    return AGENT_ROLE_MAP[ctx.agent];
  }
  if (ctx.baseAgent && BASE_AGENT_ROLE_MAP[ctx.baseAgent]) {
    return BASE_AGENT_ROLE_MAP[ctx.baseAgent];
  }
  return undefined;
}

function resolveWorkerPromptPath(ctx: CompactionSessionContext): string | undefined {
  if (ctx.workerPromptPath) {
    return ctx.workerPromptPath;
  }

  if (ctx.featureName && ctx.taskFolder) {
    return `.hive/features/${ctx.featureName}/tasks/${ctx.taskFolder}/worker-prompt.md`;
  }

  return undefined;
}

export function buildCompactionReanchor(ctx: CompactionSessionContext): CompactionReanchor {
  const role = resolveRole(ctx);
  const kind = ctx.sessionKind ?? 'unknown';
  const workerPromptPath = resolveWorkerPromptPath(ctx);
  const lines: string[] = [];
  const context: string[] = [];

  lines.push('Compaction recovery — you were compacted mid-session.');

  if (role) {
    lines.push(`Role: ${role}`);
  }

  lines.push('Do not switch roles.');
  lines.push('Do not call status tools to rediscover state.');
  lines.push('Do not re-read the full codebase.');

  if (kind === 'task-worker') {
    lines.push('Do not delegate.');
    if (workerPromptPath) {
      lines.push('Re-read worker-prompt.md now to recall your assignment.');
      context.push(workerPromptPath);
    } else {
      lines.push('Re-read worker-prompt.md from the Hive task metadata to recall your assignment.');
    }
  }

  lines.push('Next action: resume from where you left off.');

  return {
    prompt: lines.join('\n'),
    context,
  };
}
