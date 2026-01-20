import * as path from 'path';
import * as fs from 'fs';

const HIVE_DIR = '.hive';
const FEATURES_DIR = 'features';
const TASKS_DIR = 'tasks';
const CONTEXT_DIR = 'context';
const PLAN_FILE = 'plan.md';
const COMMENTS_FILE = 'comments.json';
const FEATURE_FILE = 'feature.json';
const STATUS_FILE = 'status.json';
const REPORT_FILE = 'report.md';
const APPROVED_FILE = 'APPROVED';
const JOURNAL_FILE = 'journal.md';

export function getHivePath(projectRoot: string): string {
  return path.join(projectRoot, HIVE_DIR);
}

export function getJournalPath(projectRoot: string): string {
  return path.join(getHivePath(projectRoot), JOURNAL_FILE);
}

export function getFeaturesPath(projectRoot: string): string {
  return path.join(getHivePath(projectRoot), FEATURES_DIR);
}

export function getFeaturePath(projectRoot: string, featureName: string): string {
  return path.join(getFeaturesPath(projectRoot), featureName);
}

export function getPlanPath(projectRoot: string, featureName: string): string {
  return path.join(getFeaturePath(projectRoot, featureName), PLAN_FILE);
}

export function getCommentsPath(projectRoot: string, featureName: string): string {
  return path.join(getFeaturePath(projectRoot, featureName), COMMENTS_FILE);
}

export function getFeatureJsonPath(projectRoot: string, featureName: string): string {
  return path.join(getFeaturePath(projectRoot, featureName), FEATURE_FILE);
}

export function getContextPath(projectRoot: string, featureName: string): string {
  return path.join(getFeaturePath(projectRoot, featureName), CONTEXT_DIR);
}

export function getTasksPath(projectRoot: string, featureName: string): string {
  return path.join(getFeaturePath(projectRoot, featureName), TASKS_DIR);
}

export function getTaskPath(projectRoot: string, featureName: string, taskFolder: string): string {
  return path.join(getTasksPath(projectRoot, featureName), taskFolder);
}

export function getTaskStatusPath(projectRoot: string, featureName: string, taskFolder: string): string {
  return path.join(getTaskPath(projectRoot, featureName, taskFolder), STATUS_FILE);
}

export function getTaskReportPath(projectRoot: string, featureName: string, taskFolder: string): string {
  return path.join(getTaskPath(projectRoot, featureName, taskFolder), REPORT_FILE);
}

export function getTaskSpecPath(projectRoot: string, featureName: string, taskFolder: string): string {
  return path.join(getTaskPath(projectRoot, featureName, taskFolder), 'spec.md');
}

export function getApprovedPath(projectRoot: string, featureName: string): string {
  return path.join(getFeaturePath(projectRoot, featureName), APPROVED_FILE);
}

const SUBTASKS_DIR = 'subtasks';
const SPEC_FILE = 'spec.md';

export function getSubtasksPath(projectRoot: string, featureName: string, taskFolder: string): string {
  return path.join(getTaskPath(projectRoot, featureName, taskFolder), SUBTASKS_DIR);
}

export function getSubtaskPath(projectRoot: string, featureName: string, taskFolder: string, subtaskFolder: string): string {
  return path.join(getSubtasksPath(projectRoot, featureName, taskFolder), subtaskFolder);
}

export function getSubtaskStatusPath(projectRoot: string, featureName: string, taskFolder: string, subtaskFolder: string): string {
  return path.join(getSubtaskPath(projectRoot, featureName, taskFolder, subtaskFolder), STATUS_FILE);
}

export function getSubtaskSpecPath(projectRoot: string, featureName: string, taskFolder: string, subtaskFolder: string): string {
  return path.join(getSubtaskPath(projectRoot, featureName, taskFolder, subtaskFolder), SPEC_FILE);
}

export function getSubtaskReportPath(projectRoot: string, featureName: string, taskFolder: string, subtaskFolder: string): string {
  return path.join(getSubtaskPath(projectRoot, featureName, taskFolder, subtaskFolder), REPORT_FILE);
}

export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

export function readJson<T>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as T;
}

export function writeJson<T>(filePath: string, data: T): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

export function readText(filePath: string): string | null {
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, 'utf-8');
}

export function writeText(filePath: string, content: string): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content);
}
