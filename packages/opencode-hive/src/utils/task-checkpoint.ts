import * as path from 'path';
import { ensureDir, getTaskPath, readJson, writeJson } from 'hive-core';

export type TaskCheckpointStatus = 'active' | 'blocked' | 'completed' | 'failed' | 'partial';

export interface TaskCheckpointChildSession {
  sessionId: string;
  parentSessionId: string;
  delegatedAgent: string;
  source: 'opencode-task-tool';
  kind: 'task-worker' | 'subagent';
}

export interface TaskCheckpoint {
  schemaVersion: 1;
  taskFolder: string;
  currentObjective: string;
  stateSummary: string;
  importantDecisions: string[];
  filesInPlay: string[];
  verificationState: string;
  nextAction?: string;
  blocker?: string;
  status: TaskCheckpointStatus;
  childSession?: TaskCheckpointChildSession;
  updatedAt: string;
}

export interface UpdateTaskCheckpointInput {
  featureName: string;
  taskFolder: string;
  currentObjective: string;
  stateSummary: string;
  importantDecisions: string[];
  filesInPlay: string[];
  verificationState: string;
  nextAction?: string;
  blocker?: string;
  childSession?: TaskCheckpointChildSession;
}

export interface FinalizeTaskCheckpointInput {
  status: Exclude<TaskCheckpointStatus, 'active'>;
  stateSummary: string;
  verificationState: string;
  nextAction?: string;
  blocker?: string;
}

function getCheckpointPath(projectRoot: string, featureName: string, taskFolder: string): string {
  return path.join(getTaskPath(projectRoot, featureName, taskFolder), 'checkpoint.json');
}

export function readTaskCheckpoint(projectRoot: string, featureName: string, taskFolder: string): TaskCheckpoint | undefined {
  return readJson<TaskCheckpoint>(getCheckpointPath(projectRoot, featureName, taskFolder)) ?? undefined;
}

export function updateTaskCheckpoint(projectRoot: string, input: UpdateTaskCheckpointInput): TaskCheckpoint {
  const checkpointPath = getCheckpointPath(projectRoot, input.featureName, input.taskFolder);
  ensureDir(path.dirname(checkpointPath));

  const checkpoint: TaskCheckpoint = {
    schemaVersion: 1,
    taskFolder: input.taskFolder,
    currentObjective: input.currentObjective,
    stateSummary: input.stateSummary,
    importantDecisions: [...input.importantDecisions],
    filesInPlay: [...input.filesInPlay],
    verificationState: input.verificationState,
    nextAction: input.nextAction,
    blocker: input.blocker,
    status: 'active',
    childSession: input.childSession,
    updatedAt: new Date().toISOString(),
  };

  writeJson(checkpointPath, checkpoint);
  return checkpoint;
}

export function finalizeTaskCheckpoint(
  projectRoot: string,
  featureName: string,
  taskFolder: string,
  input: FinalizeTaskCheckpointInput,
): TaskCheckpoint {
  const existing = readTaskCheckpoint(projectRoot, featureName, taskFolder);
  if (!existing) {
    throw new Error(`No checkpoint exists for ${featureName}/${taskFolder}`);
  }

  const finalized: TaskCheckpoint = {
    ...existing,
    status: input.status,
    stateSummary: input.stateSummary,
    verificationState: input.verificationState,
    nextAction: input.nextAction,
    blocker: input.blocker,
    updatedAt: new Date().toISOString(),
  };

  writeJson(getCheckpointPath(projectRoot, featureName, taskFolder), finalized);
  return finalized;
}
