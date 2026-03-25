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

export function buildCompactionReanchor(ctx: CompactionSessionContext): CompactionReanchor {
  const role = resolveRole(ctx);
  const kind = ctx.sessionKind ?? 'unknown';
  const lines: string[] = [];
  const context: string[] = [];

  lines.push('Compaction recovery — you were compacted mid-session.');

  if (role) {
    lines.push(`Role: ${role}`);
  }

  lines.push('Do not switch roles.');
  lines.push('Do not re-read the full codebase.');

  if (kind === 'task-worker') {
    lines.push('Do not delegate.');
    if (ctx.workerPromptPath) {
      lines.push('Re-read worker-prompt.md now to recall your assignment.');
      context.push(ctx.workerPromptPath);
    } else {
      lines.push('Re-read worker-prompt.md in your task worktree root to recall your assignment.');
    }
  }

  lines.push('Next action: resume from where you left off.');

  return {
    prompt: lines.join('\n'),
    context,
  };
}
