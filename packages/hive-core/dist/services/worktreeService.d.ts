export interface WorktreeInfo {
    path: string;
    branch: string;
    commit: string;
    feature: string;
    step: string;
}
export interface DiffResult {
    hasDiff: boolean;
    diffContent: string;
    filesChanged: string[];
    insertions: number;
    deletions: number;
}
export interface ApplyResult {
    success: boolean;
    error?: string;
    filesAffected: string[];
}
export interface CommitResult {
    committed: boolean;
    sha: string;
    message?: string;
}
export interface MergeResult {
    success: boolean;
    merged: boolean;
    sha?: string;
    filesChanged?: string[];
    conflicts?: string[];
    error?: string;
}
export interface WorktreeConfig {
    baseDir: string;
    hiveDir: string;
}
export declare class WorktreeService {
    private config;
    constructor(config: WorktreeConfig);
    private getGit;
    private getWorktreesDir;
    private getWorktreePath;
    private getStepStatusPath;
    private getBranchName;
    create(feature: string, step: string, baseBranch?: string): Promise<WorktreeInfo>;
    get(feature: string, step: string): Promise<WorktreeInfo | null>;
    getDiff(feature: string, step: string, baseCommit?: string): Promise<DiffResult>;
    exportPatch(feature: string, step: string, baseBranch?: string): Promise<string>;
    applyDiff(feature: string, step: string, baseBranch?: string): Promise<ApplyResult>;
    revertDiff(feature: string, step: string, baseBranch?: string): Promise<ApplyResult>;
    private parseFilesFromDiff;
    revertFromSavedDiff(diffPath: string): Promise<ApplyResult>;
    remove(feature: string, step: string, deleteBranch?: boolean): Promise<void>;
    list(feature?: string): Promise<WorktreeInfo[]>;
    cleanup(feature?: string): Promise<{
        removed: string[];
        pruned: boolean;
    }>;
    checkConflicts(feature: string, step: string, baseBranch?: string): Promise<string[]>;
    checkConflictsFromSavedDiff(diffPath: string, reverse?: boolean): Promise<string[]>;
    commitChanges(feature: string, step: string, message?: string): Promise<CommitResult>;
    merge(feature: string, step: string, strategy?: 'merge' | 'squash' | 'rebase'): Promise<MergeResult>;
    hasUncommittedChanges(feature: string, step: string): Promise<boolean>;
    private parseConflictsFromError;
}
export declare function createWorktreeService(projectDir: string): WorktreeService;
