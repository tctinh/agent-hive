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
  readText,
  writeText,
  fileExists,
} from '../utils/paths.js';
import { TaskStatus, TaskStatusType, TaskOrigin, TasksSyncResult, TaskInfo, Subtask, SubtaskType, SubtaskStatus } from '../types.js';

interface ParsedTask {
  folder: string;
  order: number;
  name: string;
  description: string;
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

  create(featureName: string, name: string, order?: number): string {
    const tasksPath = getTasksPath(this.projectRoot, featureName);
    const existingFolders = this.listFolders(featureName);
    
    const nextOrder = order ?? this.getNextOrder(existingFolders);
    const folder = `${String(nextOrder).padStart(2, '0')}-${name}`;
    const taskPath = getTaskPath(this.projectRoot, featureName, folder);

    ensureDir(taskPath);

    const status: TaskStatus = {
      status: 'pending',
      origin: 'manual',
    };
    writeJson(getTaskStatusPath(this.projectRoot, featureName, folder), status);

    return folder;
  }

  private createFromPlan(featureName: string, task: ParsedTask, allTasks: ParsedTask[]): void {
    const taskPath = getTaskPath(this.projectRoot, featureName, task.folder);
    ensureDir(taskPath);

    const status: TaskStatus = {
      status: 'pending',
      origin: 'plan',
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
      '## Description',
      '',
      task.description || '_No description provided in plan_',
      '',
    ];

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

  writeSpec(featureName: string, taskFolder: string, content: string): string {
    const specPath = getTaskSpecPath(this.projectRoot, featureName, taskFolder);
    writeText(specPath, content);
    return specPath;
  }

  readSpec(featureName: string, taskFolder: string): string | null {
    const specPath = getTaskSpecPath(this.projectRoot, featureName, taskFolder);
    return readText(specPath);
  }

  update(featureName: string, taskFolder: string, updates: Partial<Pick<TaskStatus, 'status' | 'summary' | 'baseCommit'>>): TaskStatus {
    const statusPath = getTaskStatusPath(this.projectRoot, featureName, taskFolder);
    const current = readJson<TaskStatus>(statusPath);
    
    if (!current) {
      throw new Error(`Task '${taskFolder}' not found`);
    }

    const updated: TaskStatus = {
      ...current,
      ...updates,
    };

    if (updates.status === 'in_progress' && !current.startedAt) {
      updated.startedAt = new Date().toISOString();
    }
    if (updates.status === 'done' && !current.completedAt) {
      updated.completedAt = new Date().toISOString();
    }

    writeJson(statusPath, updated);
    return updated;
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
