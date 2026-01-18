import { Subtask, SubtaskType, TaskStatusType } from '../types.js';
export declare class SubtaskService {
    private projectRoot;
    constructor(projectRoot: string);
    create(featureName: string, taskFolder: string, name: string, type?: SubtaskType): Subtask;
    update(featureName: string, taskFolder: string, subtaskId: string, status: TaskStatusType): Subtask;
    list(featureName: string, taskFolder: string): Subtask[];
    get(featureName: string, taskFolder: string, subtaskId: string): Subtask | null;
    writeSpec(featureName: string, taskFolder: string, subtaskId: string, content: string): string;
    writeReport(featureName: string, taskFolder: string, subtaskId: string, content: string): string;
    readSpec(featureName: string, taskFolder: string, subtaskId: string): string | null;
    readReport(featureName: string, taskFolder: string, subtaskId: string): string | null;
    delete(featureName: string, taskFolder: string, subtaskId: string): void;
    private listFolders;
    private findFolder;
    private slugify;
}
