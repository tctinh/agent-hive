import * as fs from "fs/promises";
import * as path from "path";
import simpleGit, { SimpleGit } from "simple-git";

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

export interface WorktreeConfig {
  baseDir: string;
  hiveDir: string;
}

export class WorktreeService {
  private config: WorktreeConfig;

  constructor(config: WorktreeConfig) {
    this.config = config;
  }

  private getGit(cwd?: string): SimpleGit {
    return simpleGit(cwd || this.config.baseDir);
  }

  private getWorktreesDir(): string {
    return path.join(this.config.hiveDir, ".worktrees");
  }

  private getWorktreePath(feature: string, step: string): string {
    return path.join(this.getWorktreesDir(), feature, step);
  }

  private getBranchName(feature: string, step: string): string {
    return `hive/${feature}/${step}`;
  }

  async create(feature: string, step: string, baseBranch?: string): Promise<WorktreeInfo> {
    const worktreePath = this.getWorktreePath(feature, step);
    const branchName = this.getBranchName(feature, step);
    const git = this.getGit();

    await fs.mkdir(path.dirname(worktreePath), { recursive: true });

    const base = baseBranch || (await git.revparse(["HEAD"])).trim();

    const existing = await this.get(feature, step);
    if (existing) {
      return existing;
    }

    try {
      await git.raw(["worktree", "add", "-b", branchName, worktreePath, base]);
    } catch {
      try {
        await git.raw(["worktree", "add", worktreePath, branchName]);
      } catch (retryError) {
        throw new Error(`Failed to create worktree: ${retryError}`);
      }
    }

    const worktreeGit = this.getGit(worktreePath);
    const commit = (await worktreeGit.revparse(["HEAD"])).trim();

    return {
      path: worktreePath,
      branch: branchName,
      commit,
      feature,
      step,
    };
  }

  async get(feature: string, step: string): Promise<WorktreeInfo | null> {
    const worktreePath = this.getWorktreePath(feature, step);
    const branchName = this.getBranchName(feature, step);

    try {
      await fs.access(worktreePath);
      const worktreeGit = this.getGit(worktreePath);
      const commit = (await worktreeGit.revparse(["HEAD"])).trim();
      return {
        path: worktreePath,
        branch: branchName,
        commit,
        feature,
        step,
      };
    } catch {
      return null;
    }
  }

  async getDiff(feature: string, step: string, baseBranch?: string): Promise<DiffResult> {
    const worktreePath = this.getWorktreePath(feature, step);
    const base = baseBranch || "HEAD~1";
    const worktreeGit = this.getGit(worktreePath);

    try {
      const diffContent = await worktreeGit.diff([`${base}...HEAD`]);
      const stat = await worktreeGit.diff([`${base}...HEAD`, "--stat"]);
      const statLines = stat.split("\n").filter((l) => l.trim());

      const filesChanged = statLines
        .slice(0, -1)
        .map((line) => line.split("|")[0].trim())
        .filter(Boolean);

      const summaryLine = statLines[statLines.length - 1] || "";
      const insertMatch = summaryLine.match(/(\d+) insertion/);
      const deleteMatch = summaryLine.match(/(\d+) deletion/);

      return {
        hasDiff: diffContent.length > 0,
        diffContent,
        filesChanged,
        insertions: insertMatch ? parseInt(insertMatch[1], 10) : 0,
        deletions: deleteMatch ? parseInt(deleteMatch[1], 10) : 0,
      };
    } catch {
      return {
        hasDiff: false,
        diffContent: "",
        filesChanged: [],
        insertions: 0,
        deletions: 0,
      };
    }
  }

  async exportPatch(feature: string, step: string, baseBranch?: string): Promise<string> {
    const worktreePath = this.getWorktreePath(feature, step);
    const patchPath = path.join(worktreePath, "..", `${step}.patch`);
    const base = baseBranch || "HEAD~1";
    const worktreeGit = this.getGit(worktreePath);

    const diff = await worktreeGit.diff([`${base}...HEAD`]);
    await fs.writeFile(patchPath, diff);

    return patchPath;
  }

  async applyDiff(feature: string, step: string, baseBranch?: string): Promise<ApplyResult> {
    const { hasDiff, diffContent, filesChanged } = await this.getDiff(feature, step, baseBranch);

    if (!hasDiff) {
      return { success: true, filesAffected: [] };
    }

    try {
      const git = this.getGit();
      await git.applyPatch(diffContent);
      return { success: true, filesAffected: filesChanged };
    } catch (error: unknown) {
      const err = error as { message?: string };
      return {
        success: false,
        error: err.message || "Failed to apply patch",
        filesAffected: [],
      };
    }
  }

  async revertDiff(feature: string, step: string, baseBranch?: string): Promise<ApplyResult> {
    const { hasDiff, diffContent, filesChanged } = await this.getDiff(feature, step, baseBranch);

    if (!hasDiff) {
      return { success: true, filesAffected: [] };
    }

    try {
      const git = this.getGit();
      await git.applyPatch(diffContent, ["-R"]);
      return { success: true, filesAffected: filesChanged };
    } catch (error: unknown) {
      const err = error as { message?: string };
      return {
        success: false,
        error: err.message || "Failed to revert patch",
        filesAffected: [],
      };
    }
  }

  private parseFilesFromDiff(diffContent: string): string[] {
    const files: string[] = [];
    const regex = /^diff --git a\/(.+?) b\//gm;
    let match;
    while ((match = regex.exec(diffContent)) !== null) {
      files.push(match[1]);
    }
    return [...new Set(files)];
  }

  async revertFromSavedDiff(diffPath: string): Promise<ApplyResult> {
    const diffContent = await fs.readFile(diffPath, "utf-8");
    if (!diffContent.trim()) {
      return { success: true, filesAffected: [] };
    }

    const filesChanged = this.parseFilesFromDiff(diffContent);

    try {
      const git = this.getGit();
      await git.applyPatch(diffContent, ["-R"]);
      return { success: true, filesAffected: filesChanged };
    } catch (error: unknown) {
      const err = error as { message?: string };
      return {
        success: false,
        error: err.message || "Failed to revert patch",
        filesAffected: [],
      };
    }
  }

  async remove(feature: string, step: string, deleteBranch = false): Promise<void> {
    const worktreePath = this.getWorktreePath(feature, step);
    const branchName = this.getBranchName(feature, step);
    const git = this.getGit();

    try {
      await git.raw(["worktree", "remove", worktreePath, "--force"]);
    } catch {
      await fs.rm(worktreePath, { recursive: true, force: true });
    }

    try {
      await git.raw(["worktree", "prune"]);
    } catch {
      /* intentional */
    }

    if (deleteBranch) {
      try {
        await git.deleteLocalBranch(branchName, true);
      } catch {
        /* intentional */
      }
    }
  }

  async list(feature?: string): Promise<WorktreeInfo[]> {
    const worktreesDir = this.getWorktreesDir();
    const results: WorktreeInfo[] = [];

    try {
      const features = feature ? [feature] : await fs.readdir(worktreesDir);

      for (const feat of features) {
        const featurePath = path.join(worktreesDir, feat);
        const stat = await fs.stat(featurePath).catch(() => null);

        if (!stat?.isDirectory()) continue;

        const steps = await fs.readdir(featurePath).catch(() => []);

        for (const step of steps) {
          const info = await this.get(feat, step);
          if (info) {
            results.push(info);
          }
        }
      }
    } catch {
      /* intentional */
    }

    return results;
  }

  async cleanup(feature?: string): Promise<{ removed: string[]; pruned: boolean }> {
    const removed: string[] = [];
    const git = this.getGit();

    try {
      await git.raw(["worktree", "prune"]);
    } catch {
      /* intentional */
    }

    const worktrees = await this.list(feature);

    for (const wt of worktrees) {
      try {
        await fs.access(wt.path);
        const worktreeGit = this.getGit(wt.path);
        await worktreeGit.revparse(["HEAD"]);
      } catch {
        await this.remove(wt.feature, wt.step, false);
        removed.push(wt.path);
      }
    }

    return { removed, pruned: true };
  }

  async checkConflicts(feature: string, step: string, baseBranch?: string): Promise<string[]> {
    const { hasDiff, diffContent } = await this.getDiff(feature, step, baseBranch);

    if (!hasDiff) {
      return [];
    }

    try {
      const git = this.getGit();
      await git.applyPatch(diffContent, ["--check"]);
      return [];
    } catch (error: unknown) {
      const err = error as { message?: string };
      const stderr = err.message || "";

      const conflicts = stderr
        .split("\n")
        .filter((line) => line.includes("error: patch failed:"))
        .map((line) => {
          const match = line.match(/error: patch failed: (.+):/);
          return match ? match[1] : null;
        })
        .filter((f): f is string => f !== null);

      return conflicts;
    }
  }

  async checkConflictsFromSavedDiff(diffPath: string, reverse = false): Promise<string[]> {
    const diffContent = await fs.readFile(diffPath, "utf-8");
    if (!diffContent.trim()) {
      return [];
    }

    try {
      const git = this.getGit();
      const options = reverse ? ["--check", "-R"] : ["--check"];
      await git.applyPatch(diffContent, options);
      return [];
    } catch (error: unknown) {
      const err = error as { message?: string };
      const stderr = err.message || "";

      const conflicts = stderr
        .split("\n")
        .filter((line) => line.includes("error: patch failed:"))
        .map((line) => {
          const match = line.match(/error: patch failed: (.+):/);
          return match ? match[1] : null;
        })
        .filter((f): f is string => f !== null);

      return conflicts;
    }
  }
}

export function createWorktreeService(projectDir: string): WorktreeService {
  return new WorktreeService({
    baseDir: projectDir,
    hiveDir: path.join(projectDir, ".hive"),
  });
}
