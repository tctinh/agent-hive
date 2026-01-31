import * as fs from 'fs';
import {
  getTasksPath,
  getTaskPath,
  getTaskStatusPath,
  getTaskReportPath,
  getTaskSpecPath,
  getSubtasksPath,
  getSubtaskPath,
  getSubtaskStatusPath,
  getSubtaskSpecPath,
  getSubtaskReportPath,
  getPlanPath,
  ensureDir,
  readJson,
  writeJson,
  writeJsonLockedSync,
  patchJsonLockedSync,
  deepMerge,
  readText,
  writeText,
  fileExists,
  LockOptions,
} from '../utils/paths.js';
import { TaskStatus, TaskStatusType, TaskOrigin, TasksSyncResult, TaskInfo, Subtask, SubtaskType, SubtaskStatus, WorkerSession } from '../types.js';

/** Current schema version for TaskStatus */
export const TASK_STATUS_SCHEMA_VERSION = 1;

/** Fields that can be updated by background workers without clobbering completion-owned fields */
export interface BackgroundPatchFields {
  idempotencyKey?: string;
  workerSession?: Partial<WorkerSession>;
}

/** Fields owned by the completion flow (not to be touched by background patches) */
export interface CompletionFields {
  status?: TaskStatusType;
  summary?: string;
  completedAt?: string;
}

interface ParsedTask {
  folder: string;
  order: number;
  name: string;
  description: string;
  /** Raw dependency numbers parsed from plan. null = not specified (use implicit), [] = explicit none */
  dependsOnNumbers: number[] | null;
}

export class TaskService {
  constructor(private projectRoot: string) {}

  sync(featureName: string): TasksSyncResult {
    const planPath = getPlanPath(this.projectRoot, featureName);
    const planContent = readText(planPath);
    
    if (!planContent) {
      throw new Error(`No plan.md found for feature '${featureName}'`);
    }

    const planTasks = this.parseTasksFromPlan(planContent);
    
    // Validate dependency graph before proceeding
    this.validateDependencyGraph(planTasks, featureName);
    
    const existingTasks = this.list(featureName);
    
    const result: TasksSyncResult = {
      created: [],
      removed: [],
      kept: [],
      manual: [],
    };

    const existingByName = new Map(existingTasks.map(t => [t.folder, t]));

    for (const existing of existingTasks) {
      if (existing.origin === 'manual') {
        result.manual.push(existing.folder);
        continue;
      }

      if (existing.status === 'done' || existing.status === 'in_progress') {
        result.kept.push(existing.folder);
        continue;
      }

      if (existing.status === 'cancelled') {
        this.deleteTask(featureName, existing.folder);
        result.removed.push(existing.folder);
        continue;
      }

      const stillInPlan = planTasks.some(p => p.folder === existing.folder);
      if (!stillInPlan) {
        this.deleteTask(featureName, existing.folder);
        result.removed.push(existing.folder);
      } else {
        result.kept.push(existing.folder);
      }
    }

    for (const planTask of planTasks) {
      if (!existingByName.has(planTask.folder)) {
        this.createFromPlan(featureName, planTask, planTasks);
        result.created.push(planTask.folder);
      }
    }

    return result;
  }

  /**
   * Create a manual task with auto-incrementing index.
   * Folder format: "01-task-name", "02-task-name", etc.
   * Index ensures alphabetical sort = chronological order.
   */
  create(featureName: string, name: string, order?: number): string {
    const tasksPath = getTasksPath(this.projectRoot, featureName);
    const existingFolders = this.listFolders(featureName);
    
    // Auto-increment: finds max existing index + 1
    const nextOrder = order ?? this.getNextOrder(existingFolders);
    // Zero-pad to 2 digits for correct alphabetical sorting (01, 02, ... 99)
    const folder = `${String(nextOrder).padStart(2, '0')}-${name}`;
    const taskPath = getTaskPath(this.projectRoot, featureName, folder);

    ensureDir(taskPath);

    const status: TaskStatus = {
      status: 'pending',
      origin: 'manual',
      planTitle: name,
    };
    writeJson(getTaskStatusPath(this.projectRoot, featureName, folder), status);

    return folder;
  }

  private createFromPlan(featureName: string, task: ParsedTask, allTasks: ParsedTask[]): void {
    const taskPath = getTaskPath(this.projectRoot, featureName, task.folder);
    ensureDir(taskPath);

    // Resolve dependencies: numbers -> folder names
    const dependsOn = this.resolveDependencies(task, allTasks);

    const status: TaskStatus = {
      status: 'pending',
      origin: 'plan',
      planTitle: task.name,
      dependsOn,
    };
    writeJson(getTaskStatusPath(this.projectRoot, featureName, task.folder), status);

    // Write enhanced spec.md with full context
    const specLines: string[] = [
      `# Task ${task.order}: ${task.name}`,
      '',
      `**Feature:** ${featureName}`,
      `**Folder:** ${task.folder}`,
      `**Status:** pending`,
      '',
      '---',
      '',
    ];

    // Add dependencies section
    specLines.push('## Dependencies', '');
    if (dependsOn.length > 0) {
      for (const dep of dependsOn) {
        const depTask = allTasks.find(t => t.folder === dep);
        if (depTask) {
          specLines.push(`- **${depTask.order}. ${depTask.name}** (${dep})`);
        } else {
          specLines.push(`- ${dep}`);
        }
      }
    } else {
      specLines.push('_None_');
    }
    specLines.push('', '---', '');

    specLines.push('## Description', '');
    specLines.push(task.description || '_No description provided in plan_', '');

    // Add prior tasks section if not first task
    if (task.order > 1) {
      const priorTasks = allTasks.filter(t => t.order < task.order);
      if (priorTasks.length > 0) {
        specLines.push('---', '', '## Prior Tasks', '');
        for (const prior of priorTasks) {
          specLines.push(`- **${prior.order}. ${prior.name}** (${prior.folder})`);
        }
        specLines.push('');
      }
    }

    // Add next tasks section if not last task
    const nextTasks = allTasks.filter(t => t.order > task.order);
    if (nextTasks.length > 0) {
      specLines.push('---', '', '## Upcoming Tasks', '');
      for (const next of nextTasks) {
        specLines.push(`- **${next.order}. ${next.name}** (${next.folder})`);
      }
      specLines.push('');
    }

    writeText(getTaskSpecPath(this.projectRoot, featureName, task.folder), specLines.join('\n'));
  }

  /**
   * Resolve dependency numbers to folder names.
   * - If dependsOnNumbers is null (not specified), apply implicit sequential default (N-1 for N > 1).
   * - If dependsOnNumbers is [] (explicit "none"), return empty array.
   * - Otherwise, map numbers to corresponding task folders.
   */
  private resolveDependencies(task: ParsedTask, allTasks: ParsedTask[]): string[] {
    // Explicit "none" - no dependencies
    if (task.dependsOnNumbers !== null && task.dependsOnNumbers.length === 0) {
      return [];
    }

    // Explicit dependency numbers provided
    if (task.dependsOnNumbers !== null) {
      return task.dependsOnNumbers
        .map(num => allTasks.find(t => t.order === num)?.folder)
        .filter((folder): folder is string => folder !== undefined);
    }

    // Implicit sequential default: depend on previous task (N-1)
    if (task.order === 1) {
      return [];
    }

    const previousTask = allTasks.find(t => t.order === task.order - 1);
    return previousTask ? [previousTask.folder] : [];
  }

  /**
   * Validate the dependency graph for errors before creating tasks.
   * Throws descriptive errors pointing the operator to fix plan.md.
   * 
   * Checks for:
   * - Unknown task numbers in dependencies
   * - Self-dependencies
   * - Cycles (using DFS topological sort)
   */
  private validateDependencyGraph(tasks: ParsedTask[], featureName: string): void {
    const taskNumbers = new Set(tasks.map(t => t.order));
    
    // Validate each task's dependencies
    for (const task of tasks) {
      if (task.dependsOnNumbers === null) {
        // Implicit dependencies - no validation needed
        continue;
      }
      
      for (const depNum of task.dependsOnNumbers) {
        // Check for self-dependency
        if (depNum === task.order) {
          throw new Error(
            `Invalid dependency graph in plan.md: Self-dependency detected for task ${task.order} ("${task.name}"). ` +
            `A task cannot depend on itself. Please fix the "Depends on:" line in plan.md.`
          );
        }
        
        // Check for unknown task number
        if (!taskNumbers.has(depNum)) {
          throw new Error(
            `Invalid dependency graph in plan.md: Unknown task number ${depNum} referenced in dependencies for task ${task.order} ("${task.name}"). ` +
            `Available task numbers are: ${Array.from(taskNumbers).sort((a, b) => a - b).join(', ')}. ` +
            `Please fix the "Depends on:" line in plan.md.`
          );
        }
      }
    }
    
    // Check for cycles using DFS
    this.detectCycles(tasks);
  }

  /**
   * Detect cycles in the dependency graph using DFS.
   * Throws a descriptive error if a cycle is found.
   */
  private detectCycles(tasks: ParsedTask[]): void {
    // Build adjacency list: task order -> [dependency orders]
    const taskByOrder = new Map(tasks.map(t => [t.order, t]));
    
    // Build dependency graph with resolved implicit dependencies
    const getDependencies = (task: ParsedTask): number[] => {
      if (task.dependsOnNumbers !== null) {
        return task.dependsOnNumbers;
      }
      // Implicit sequential dependency
      if (task.order === 1) {
        return [];
      }
      return [task.order - 1];
    };
    
    // Track visited state: 0 = unvisited, 1 = in current path, 2 = fully processed
    const visited = new Map<number, number>();
    const path: number[] = [];
    
    const dfs = (taskOrder: number): void => {
      const state = visited.get(taskOrder);
      
      if (state === 2) {
        // Already fully processed, no cycle through here
        return;
      }
      
      if (state === 1) {
        // Found a cycle! Build the cycle path for the error message
        const cycleStart = path.indexOf(taskOrder);
        const cyclePath = [...path.slice(cycleStart), taskOrder];
        const cycleDesc = cyclePath.join(' -> ');
        
        throw new Error(
          `Invalid dependency graph in plan.md: Cycle detected in task dependencies: ${cycleDesc}. ` +
          `Tasks cannot have circular dependencies. Please fix the "Depends on:" lines in plan.md.`
        );
      }
      
      // Mark as in current path
      visited.set(taskOrder, 1);
      path.push(taskOrder);
      
      const task = taskByOrder.get(taskOrder);
      if (task) {
        const deps = getDependencies(task);
        for (const depOrder of deps) {
          dfs(depOrder);
        }
      }
      
      // Mark as fully processed
      path.pop();
      visited.set(taskOrder, 2);
    };
    
    // Run DFS from each node
    for (const task of tasks) {
      if (!visited.has(task.order)) {
        dfs(task.order);
      }
    }
  }

  writeSpec(featureName: string, taskFolder: string, content: string): string {
    const specPath = getTaskSpecPath(this.projectRoot, featureName, taskFolder);
    writeText(specPath, content);
    return specPath;
  }

  /**
   * Update task status with locked atomic write.
   * Uses file locking to prevent race conditions between concurrent updates.
   * 
   * @param featureName - Feature name
   * @param taskFolder - Task folder name
   * @param updates - Fields to update (status, summary, baseCommit)
   * @param lockOptions - Optional lock configuration
   * @returns Updated TaskStatus
   */
  update(
    featureName: string,
    taskFolder: string,
    updates: Partial<Pick<TaskStatus, 'status' | 'summary' | 'baseCommit'>>,
    lockOptions?: LockOptions
  ): TaskStatus {
    const statusPath = getTaskStatusPath(this.projectRoot, featureName, taskFolder);
    const current = readJson<TaskStatus>(statusPath);
    
    if (!current) {
      throw new Error(`Task '${taskFolder}' not found`);
    }

    const updated: TaskStatus = {
      ...current,
      ...updates,
      schemaVersion: TASK_STATUS_SCHEMA_VERSION,
    };

    if (updates.status === 'in_progress' && !current.startedAt) {
      updated.startedAt = new Date().toISOString();
    }
    if (updates.status === 'done' && !current.completedAt) {
      updated.completedAt = new Date().toISOString();
    }

    // Use locked atomic write to prevent race conditions
    writeJsonLockedSync(statusPath, updated, lockOptions);
    return updated;
  }

  /**
   * Patch only background-owned fields without clobbering completion-owned fields.
   * Safe for concurrent use by background workers.
   * 
   * Uses deep merge for workerSession to allow partial updates like:
   * - patchBackgroundFields(..., { workerSession: { lastHeartbeatAt: '...' } })
   *   will update only lastHeartbeatAt, preserving other workerSession fields.
   * 
   * @param featureName - Feature name
   * @param taskFolder - Task folder name
   * @param patch - Background-owned fields to update
   * @param lockOptions - Optional lock configuration
   * @returns Updated TaskStatus
   */
  patchBackgroundFields(
    featureName: string,
    taskFolder: string,
    patch: BackgroundPatchFields,
    lockOptions?: LockOptions
  ): TaskStatus {
    const statusPath = getTaskStatusPath(this.projectRoot, featureName, taskFolder);
    
    // Build the patch object, only including fields that are defined
    const safePatch: Partial<TaskStatus> = {
      schemaVersion: TASK_STATUS_SCHEMA_VERSION,
    };
    
    if (patch.idempotencyKey !== undefined) {
      safePatch.idempotencyKey = patch.idempotencyKey;
    }
    
    if (patch.workerSession !== undefined) {
      safePatch.workerSession = patch.workerSession as WorkerSession;
    }
    
    // Use patchJsonLockedSync which does deep merge
    return patchJsonLockedSync<TaskStatus>(statusPath, safePatch, lockOptions);
  }

  /**
   * Get raw TaskStatus including all fields (for internal use or debugging).
   */
  getRawStatus(featureName: string, taskFolder: string): TaskStatus | null {
    const statusPath = getTaskStatusPath(this.projectRoot, featureName, taskFolder);
    return readJson<TaskStatus>(statusPath);
  }

  get(featureName: string, taskFolder: string): TaskInfo | null {
    const statusPath = getTaskStatusPath(this.projectRoot, featureName, taskFolder);
    const status = readJson<TaskStatus>(statusPath);
    
    if (!status) return null;

    return {
      folder: taskFolder,
      name: taskFolder.replace(/^\d+-/, ''),
      status: status.status,
      origin: status.origin,
      planTitle: status.planTitle,
      summary: status.summary,
    };
  }

  list(featureName: string): TaskInfo[] {
    const folders = this.listFolders(featureName);
    return folders
      .map(folder => this.get(featureName, folder))
      .filter((t): t is TaskInfo => t !== null);
  }

  writeReport(featureName: string, taskFolder: string, report: string): string {
    const reportPath = getTaskReportPath(this.projectRoot, featureName, taskFolder);
    writeText(reportPath, report);
    return reportPath;
  }

  private listFolders(featureName: string): string[] {
    const tasksPath = getTasksPath(this.projectRoot, featureName);
    if (!fileExists(tasksPath)) return [];

    return fs.readdirSync(tasksPath, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name)
      .sort();
  }

  private deleteTask(featureName: string, taskFolder: string): void {
    const taskPath = getTaskPath(this.projectRoot, featureName, taskFolder);
    if (fileExists(taskPath)) {
      fs.rmSync(taskPath, { recursive: true });
    }
  }

  private getNextOrder(existingFolders: string[]): number {
    if (existingFolders.length === 0) return 1;
    
    const orders = existingFolders
      .map(f => parseInt(f.split('-')[0], 10))
      .filter(n => !isNaN(n));
    
    return Math.max(...orders, 0) + 1;
  }

  private parseTasksFromPlan(content: string): ParsedTask[] {
    const tasks: ParsedTask[] = [];
    const lines = content.split('\n');
    
    let currentTask: ParsedTask | null = null;
    let descriptionLines: string[] = [];
    
    // Regex to match "Depends on:" or "**Depends on**:" with optional markdown
    // Strips markdown formatting (**, *, etc.) and captures the value
    const dependsOnRegex = /^\s*\*{0,2}Depends\s+on\*{0,2}\s*:\s*(.+)$/i;
    
    for (const line of lines) {
      // Check for task header: ### N. Task Name
      const taskMatch = line.match(/^###\s+(\d+)\.\s+(.+)$/);
      
      if (taskMatch) {
        // Save previous task if exists
        if (currentTask) {
          currentTask.description = descriptionLines.join('\n').trim();
          tasks.push(currentTask);
        }
        
        const order = parseInt(taskMatch[1], 10);
        const rawName = taskMatch[2].trim();
        const folderName = rawName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        const folder = `${String(order).padStart(2, '0')}-${folderName}`;
        
        currentTask = {
          folder,
          order,
          name: rawName,
          description: '',
          dependsOnNumbers: null,  // null = not specified, use implicit
        };
        descriptionLines = [];
      } else if (currentTask) {
        // Check for end of task section (next ## header or ### without number)
        if (line.match(/^##\s+/) || line.match(/^###\s+[^0-9]/)) {
          currentTask.description = descriptionLines.join('\n').trim();
          tasks.push(currentTask);
          currentTask = null;
          descriptionLines = [];
        } else {
          // Check for Depends on: annotation within task section
          const dependsMatch = line.match(dependsOnRegex);
          if (dependsMatch) {
            const value = dependsMatch[1].trim().toLowerCase();
            if (value === 'none') {
              currentTask.dependsOnNumbers = [];
            } else {
              // Parse comma-separated numbers
              const numbers = value
                .split(/[,\s]+/)
                .map(s => parseInt(s.trim(), 10))
                .filter(n => !isNaN(n));
              currentTask.dependsOnNumbers = numbers;
            }
          }
          descriptionLines.push(line);
        }
      }
    }
    
    // Don't forget the last task
    if (currentTask) {
      currentTask.description = descriptionLines.join('\n').trim();
      tasks.push(currentTask);
    }

    return tasks;
  }

  createSubtask(featureName: string, taskFolder: string, name: string, type?: SubtaskType): Subtask {
    const subtasksPath = getSubtasksPath(this.projectRoot, featureName, taskFolder);
    ensureDir(subtasksPath);

    const existingFolders = this.listSubtaskFolders(featureName, taskFolder);
    const taskOrder = parseInt(taskFolder.split('-')[0], 10);
    const nextOrder = existingFolders.length + 1;
    const subtaskId = `${taskOrder}.${nextOrder}`;
    const folderName = `${nextOrder}-${this.slugify(name)}`;
    const subtaskPath = getSubtaskPath(this.projectRoot, featureName, taskFolder, folderName);

    ensureDir(subtaskPath);

    const subtaskStatus: SubtaskStatus = {
      status: 'pending',
      type,
      createdAt: new Date().toISOString(),
    };
    writeJson(getSubtaskStatusPath(this.projectRoot, featureName, taskFolder, folderName), subtaskStatus);

    const specContent = `# Subtask: ${name}\n\n**Type:** ${type || 'custom'}\n**ID:** ${subtaskId}\n\n## Instructions\n\n_Add detailed instructions here_\n`;
    writeText(getSubtaskSpecPath(this.projectRoot, featureName, taskFolder, folderName), specContent);

    return {
      id: subtaskId,
      name,
      folder: folderName,
      status: 'pending',
      type,
      createdAt: subtaskStatus.createdAt,
    };
  }

  updateSubtask(featureName: string, taskFolder: string, subtaskId: string, status: TaskStatusType): Subtask {
    const subtaskFolder = this.findSubtaskFolder(featureName, taskFolder, subtaskId);
    if (!subtaskFolder) {
      throw new Error(`Subtask '${subtaskId}' not found in task '${taskFolder}'`);
    }

    const statusPath = getSubtaskStatusPath(this.projectRoot, featureName, taskFolder, subtaskFolder);
    const current = readJson<SubtaskStatus>(statusPath);
    if (!current) {
      throw new Error(`Subtask status not found for '${subtaskId}'`);
    }

    const updated: SubtaskStatus = { ...current, status };
    if (status === 'done' && !current.completedAt) {
      updated.completedAt = new Date().toISOString();
    }

    writeJson(statusPath, updated);

    const name = subtaskFolder.replace(/^\d+-/, '');
    return {
      id: subtaskId,
      name,
      folder: subtaskFolder,
      status,
      type: current.type,
      createdAt: current.createdAt,
      completedAt: updated.completedAt,
    };
  }

  listSubtasks(featureName: string, taskFolder: string): Subtask[] {
    const folders = this.listSubtaskFolders(featureName, taskFolder);
    const taskOrder = parseInt(taskFolder.split('-')[0], 10);

    return folders.map((folder, index) => {
      const statusPath = getSubtaskStatusPath(this.projectRoot, featureName, taskFolder, folder);
      const status = readJson<SubtaskStatus>(statusPath);
      const name = folder.replace(/^\d+-/, '');
      const subtaskOrder = parseInt(folder.split('-')[0], 10) || (index + 1);

      return {
        id: `${taskOrder}.${subtaskOrder}`,
        name,
        folder,
        status: status?.status || 'pending',
        type: status?.type,
        createdAt: status?.createdAt,
        completedAt: status?.completedAt,
      };
    });
  }

  deleteSubtask(featureName: string, taskFolder: string, subtaskId: string): void {
    const subtaskFolder = this.findSubtaskFolder(featureName, taskFolder, subtaskId);
    if (!subtaskFolder) {
      throw new Error(`Subtask '${subtaskId}' not found in task '${taskFolder}'`);
    }

    const subtaskPath = getSubtaskPath(this.projectRoot, featureName, taskFolder, subtaskFolder);
    if (fileExists(subtaskPath)) {
      fs.rmSync(subtaskPath, { recursive: true });
    }
  }

  getSubtask(featureName: string, taskFolder: string, subtaskId: string): Subtask | null {
    const subtaskFolder = this.findSubtaskFolder(featureName, taskFolder, subtaskId);
    if (!subtaskFolder) return null;

    const statusPath = getSubtaskStatusPath(this.projectRoot, featureName, taskFolder, subtaskFolder);
    const status = readJson<SubtaskStatus>(statusPath);
    if (!status) return null;

    const taskOrder = parseInt(taskFolder.split('-')[0], 10);
    const subtaskOrder = parseInt(subtaskFolder.split('-')[0], 10);
    const name = subtaskFolder.replace(/^\d+-/, '');

    return {
      id: `${taskOrder}.${subtaskOrder}`,
      name,
      folder: subtaskFolder,
      status: status.status,
      type: status.type,
      createdAt: status.createdAt,
      completedAt: status.completedAt,
    };
  }

  writeSubtaskSpec(featureName: string, taskFolder: string, subtaskId: string, content: string): string {
    const subtaskFolder = this.findSubtaskFolder(featureName, taskFolder, subtaskId);
    if (!subtaskFolder) {
      throw new Error(`Subtask '${subtaskId}' not found in task '${taskFolder}'`);
    }

    const specPath = getSubtaskSpecPath(this.projectRoot, featureName, taskFolder, subtaskFolder);
    writeText(specPath, content);
    return specPath;
  }

  writeSubtaskReport(featureName: string, taskFolder: string, subtaskId: string, content: string): string {
    const subtaskFolder = this.findSubtaskFolder(featureName, taskFolder, subtaskId);
    if (!subtaskFolder) {
      throw new Error(`Subtask '${subtaskId}' not found in task '${taskFolder}'`);
    }

    const reportPath = getSubtaskReportPath(this.projectRoot, featureName, taskFolder, subtaskFolder);
    writeText(reportPath, content);
    return reportPath;
  }

  readSubtaskSpec(featureName: string, taskFolder: string, subtaskId: string): string | null {
    const subtaskFolder = this.findSubtaskFolder(featureName, taskFolder, subtaskId);
    if (!subtaskFolder) return null;

    const specPath = getSubtaskSpecPath(this.projectRoot, featureName, taskFolder, subtaskFolder);
    return readText(specPath);
  }

  readSubtaskReport(featureName: string, taskFolder: string, subtaskId: string): string | null {
    const subtaskFolder = this.findSubtaskFolder(featureName, taskFolder, subtaskId);
    if (!subtaskFolder) return null;

    const reportPath = getSubtaskReportPath(this.projectRoot, featureName, taskFolder, subtaskFolder);
    return readText(reportPath);
  }

  private listSubtaskFolders(featureName: string, taskFolder: string): string[] {
    const subtasksPath = getSubtasksPath(this.projectRoot, featureName, taskFolder);
    if (!fileExists(subtasksPath)) return [];

    return fs.readdirSync(subtasksPath, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name)
      .sort();
  }

  private findSubtaskFolder(featureName: string, taskFolder: string, subtaskId: string): string | null {
    const folders = this.listSubtaskFolders(featureName, taskFolder);
    const subtaskOrder = subtaskId.split('.')[1];
    return folders.find(f => f.startsWith(`${subtaskOrder}-`)) || null;
  }

  private slugify(name: string): string {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  }
}
