const COMPACTION_RESUME_PROMPT =
  'You were compacted mid-task. ' +
  'Resume by reading your worker-prompt.md (in the task worktree root) to recall your assignment. ' +
  'Do not call status tools or re-read the full codebase. ' +
  'Locate your last commit message or notes, then continue from where you left off.';

export function buildCompactionPrompt(): string {
  return COMPACTION_RESUME_PROMPT;
}
