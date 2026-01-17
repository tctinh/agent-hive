/**
 * Checkpoint monitor for delegated worker execution.
 * Watches for CHECKPOINT files in active worktrees.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface Checkpoint {
  reason: string;
  status: string;
  next: string;
  decisionNeeded: boolean;
  timestamp: Date;
  worktreePath: string;
  task: string;
}

export interface WorkerStatus {
  task: string;
  feature: string;
  worktreePath: string;
  branch: string;
  status: 'running' | 'checkpoint' | 'completed' | 'failed';
  checkpoint?: Checkpoint;
  startedAt: Date;
}

// Track active workers
const activeWorkers = new Map<string, WorkerStatus>();

/**
 * Register a worker when hive_exec_start spawns it in delegated mode.
 */
export function registerWorker(params: {
  feature: string;
  task: string;
  worktreePath: string;
  branch: string;
}): void {
  const key = `${params.feature}/${params.task}`;
  activeWorkers.set(key, {
    ...params,
    status: 'running',
    startedAt: new Date(),
  });
}

/**
 * Unregister a worker when it completes.
 */
export function unregisterWorker(feature: string, task: string): void {
  const key = `${feature}/${task}`;
  activeWorkers.delete(key);
}

/**
 * Parse a CHECKPOINT file content.
 */
function parseCheckpoint(content: string, worktreePath: string, task: string): Checkpoint {
  const lines = content.split('\n');
  const checkpoint: Checkpoint = {
    reason: '',
    status: '',
    next: '',
    decisionNeeded: false,
    timestamp: new Date(),
    worktreePath,
    task,
  };

  for (const line of lines) {
    const [key, ...valueParts] = line.split(':');
    const value = valueParts.join(':').trim();
    
    switch (key.trim().toUpperCase()) {
      case 'REASON':
        checkpoint.reason = value;
        break;
      case 'STATUS':
        checkpoint.status = value;
        break;
      case 'NEXT':
        checkpoint.next = value;
        break;
      case 'DECISION_NEEDED':
        checkpoint.decisionNeeded = value.toLowerCase() === 'yes';
        break;
    }
  }

  return checkpoint;
}

/**
 * Check if a worktree has a CHECKPOINT file.
 */
export function checkForCheckpoint(worktreePath: string, task: string): Checkpoint | null {
  const checkpointPath = path.join(worktreePath, '.hive', 'CHECKPOINT');
  
  if (!fs.existsSync(checkpointPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(checkpointPath, 'utf-8');
    return parseCheckpoint(content, worktreePath, task);
  } catch {
    return null;
  }
}

/**
 * Clear a checkpoint (after user acknowledges it).
 */
export function clearCheckpoint(worktreePath: string): boolean {
  const checkpointPath = path.join(worktreePath, '.hive', 'CHECKPOINT');
  
  try {
    if (fs.existsSync(checkpointPath)) {
      fs.unlinkSync(checkpointPath);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Get status of all active workers.
 */
export function getActiveWorkers(): WorkerStatus[] {
  const workers: WorkerStatus[] = [];

  for (const [, worker] of activeWorkers) {
    // Check for checkpoint
    const checkpoint = checkForCheckpoint(worker.worktreePath, worker.task);
    
    workers.push({
      ...worker,
      status: checkpoint ? 'checkpoint' : worker.status,
      checkpoint: checkpoint ?? undefined,
    });
  }

  return workers;
}

/**
 * Get status of a specific worker.
 */
export function getWorkerStatus(feature: string, task: string): WorkerStatus | null {
  const key = `${feature}/${task}`;
  const worker = activeWorkers.get(key);
  
  if (!worker) {
    return null;
  }

  const checkpoint = checkForCheckpoint(worker.worktreePath, worker.task);
  
  return {
    ...worker,
    status: checkpoint ? 'checkpoint' : worker.status,
    checkpoint: checkpoint ?? undefined,
  };
}

/**
 * Mark a worker as completed.
 */
export function markWorkerCompleted(feature: string, task: string): void {
  const key = `${feature}/${task}`;
  const worker = activeWorkers.get(key);
  
  if (worker) {
    worker.status = 'completed';
  }
}

/**
 * Mark a worker as failed.
 */
export function markWorkerFailed(feature: string, task: string): void {
  const key = `${feature}/${task}`;
  const worker = activeWorkers.get(key);
  
  if (worker) {
    worker.status = 'failed';
  }
}
