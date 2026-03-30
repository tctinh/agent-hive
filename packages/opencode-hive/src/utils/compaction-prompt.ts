import { buildCompactionReanchor } from './compaction-anchor.js';

export function buildCompactionPrompt(): string {
  return buildCompactionReanchor({ sessionKind: 'task-worker' }).prompt;
}
