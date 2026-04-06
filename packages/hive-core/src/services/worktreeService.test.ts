import { afterEach, describe, expect, it } from "bun:test";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import simpleGit, { type SimpleGit } from "simple-git";
import { WorktreeService } from "./worktreeService";

interface TestFixture {
  repoPath: string;
  worktreePath: string;
  feature: string;
  task: string;
  service: WorktreeService;
  repoGit: SimpleGit;
}

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map(async (dir) => {
      await fs.rm(dir, { recursive: true, force: true });
    }),
  );
});

async function createTempRepo(): Promise<{ repoPath: string; repoGit: SimpleGit }> {
  const repoPath = await fs.mkdtemp(path.join(os.tmpdir(), "hive-core-worktree-service-test-"));
  tempDirs.push(repoPath);

  const rootGit = simpleGit();
  try {
    await rootGit.raw(["init", "-b", "main", repoPath]);
  } catch {
    await rootGit.raw(["init", repoPath]);
    await simpleGit(repoPath).raw(["branch", "-M", "main"]);
  }

  const repoGit = simpleGit(repoPath);
  await repoGit.raw(["config", "user.email", "test@example.com"]);
  await repoGit.raw(["config", "user.name", "Test User"]);

  await fs.writeFile(path.join(repoPath, "tracked.txt"), "base\n", "utf-8");
  await repoGit.add("tracked.txt");
  await repoGit.commit("chore: base commit");

  return { repoPath, repoGit };
}

async function createFixture(): Promise<TestFixture> {
  const { repoPath, repoGit } = await createTempRepo();
  const feature = "test-feature";
  const task = "01-test-task";
  const service = new WorktreeService({
    baseDir: repoPath,
    hiveDir: path.join(repoPath, ".hive"),
  });

  const worktree = await service.create(feature, task);

  return {
    repoPath,
    worktreePath: worktree.path,
    feature,
    task,
    service,
    repoGit,
  };
}

async function createCommittedFixture(): Promise<TestFixture> {
  const fixture = await createFixture();

  await fs.writeFile(path.join(fixture.worktreePath, "task-change.txt"), "task change\n", "utf-8");
  const result = await fixture.service.commitChanges(fixture.feature, fixture.task, "chore: task change");
  expect(result.committed).toBe(true);

  await fixture.repoGit.checkout("main");

  return fixture;
}

async function createConflictingFixture(): Promise<TestFixture> {
  const fixture = await createFixture();

  await fs.writeFile(path.join(fixture.worktreePath, 'tracked.txt'), 'task change\n', 'utf-8');
  const taskCommit = await fixture.service.commitChanges(
    fixture.feature,
    fixture.task,
    'chore: conflicting task change',
  );
  expect(taskCommit.committed).toBe(true);

  await fixture.repoGit.checkout('main');
  await fs.writeFile(path.join(fixture.repoPath, 'tracked.txt'), 'main change\n', 'utf-8');
  await fixture.repoGit.add('tracked.txt');
  await fixture.repoGit.commit('chore: conflicting main change');

  return fixture;
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function branchExists(git: SimpleGit, branchName: string): Promise<boolean> {
  const branches = await git.branch();
  return branches.all.includes(branchName);
}

async function readHeadBody(targetPath: string): Promise<string> {
  const git = simpleGit(targetPath);
  const body = await git.raw(["log", "-1", "--format=%B"]);
  return body.trimEnd();
}

describe("WorktreeService merge and commit messages", () => {
  it("uses logical feature names for indexed worktree storage and branch naming", async () => {
    const { repoPath } = await createTempRepo();
    const service = new WorktreeService({
      baseDir: repoPath,
      hiveDir: path.join(repoPath, ".hive"),
    });

    await fs.mkdir(path.join(repoPath, ".hive", "features", "03_test-feature", "tasks", "01-test-task"), {
      recursive: true,
    });
    await fs.writeFile(
      path.join(repoPath, ".hive", "features", "03_test-feature", "tasks", "01-test-task", "status.json"),
      JSON.stringify({ status: "pending", origin: "plan" }),
      "utf-8",
    );

    const worktree = await service.create("test-feature", "01-test-task");

    expect(worktree.path).toBe(path.join(repoPath, ".hive", ".worktrees", "test-feature", "01-test-task"));
    expect(worktree.branch).toBe("hive/test-feature/01-test-task");
    expect(await service.get("test-feature", "01-test-task")).not.toBeNull();
  });

  it("uses a custom commit message verbatim, including body text", async () => {
    const fixture = await createFixture();
    await fs.writeFile(path.join(fixture.worktreePath, "custom-commit.txt"), "custom\n", "utf-8");

    const message = "feat(core): custom subject\n\nbody line 1\nbody line 2";
    const result = await fixture.service.commitChanges(fixture.feature, fixture.task, message);

    expect(result.committed).toBe(true);
    expect(await readHeadBody(fixture.worktreePath)).toBe(message);
  });

  it("falls back when commit message is an empty string", async () => {
    const fixture = await createFixture();
    await fs.writeFile(path.join(fixture.worktreePath, "empty-commit-message.txt"), "empty\n", "utf-8");

    await fixture.service.commitChanges(fixture.feature, fixture.task, "");

    expect(await readHeadBody(fixture.worktreePath)).toBe("hive(01-test-task): task changes");
  });

  it("uses a custom merge message verbatim, including body text", async () => {
    const fixture = await createCommittedFixture();
    const message = "feat(core): merge task\n\nmerge body";

    const result = await fixture.service.merge(fixture.feature, fixture.task, "merge", message);

    expect(result.success).toBe(true);
    expect(result.strategy).toBe('merge');
    expect(result.conflictState).toBe('none');
    expect(result.cleanup).toEqual({
      worktreeRemoved: false,
      branchDeleted: false,
      pruned: false,
    });
    expect(await readHeadBody(fixture.repoPath)).toBe(message);
  });

  it("uses a custom squash message verbatim, including body text", async () => {
    const fixture = await createCommittedFixture();
    const message = "feat(core): squash task\n\nsquash body";

    const result = await fixture.service.merge(fixture.feature, fixture.task, "squash", message);

    expect(result.success).toBe(true);
    expect(result.strategy).toBe('squash');
    expect(result.conflictState).toBe('none');
    expect(result.cleanup).toEqual({
      worktreeRemoved: false,
      branchDeleted: false,
      pruned: false,
    });
    expect(await readHeadBody(fixture.repoPath)).toBe(message);
  });

  it('returns helper-friendly merge details and preserves branch/worktree by default', async () => {
    const fixture = await createCommittedFixture();

    const result = await fixture.service.merge(fixture.feature, fixture.task, 'merge');

    expect(result).toMatchObject({
      success: true,
      merged: true,
      strategy: 'merge',
      filesChanged: ['task-change.txt'],
      conflicts: [],
      conflictState: 'none',
      cleanup: {
        worktreeRemoved: false,
        branchDeleted: false,
        pruned: false,
      },
    });
    expect(typeof result.sha).toBe('string');
    expect(await pathExists(fixture.worktreePath)).toBe(true);
    expect(await branchExists(fixture.repoGit, 'hive/test-feature/01-test-task')).toBe(true);
  });

  it('removes the worktree but keeps the branch when cleanup is worktree', async () => {
    const fixture = await createCommittedFixture();

    const result = await fixture.service.merge(fixture.feature, fixture.task, 'merge', undefined, {
      cleanup: 'worktree',
    });

    expect(result).toMatchObject({
      success: true,
      merged: true,
      strategy: 'merge',
      conflictState: 'none',
      cleanup: {
        worktreeRemoved: true,
        branchDeleted: false,
        pruned: true,
      },
    });
    expect(await pathExists(fixture.worktreePath)).toBe(false);
    expect(await branchExists(fixture.repoGit, 'hive/test-feature/01-test-task')).toBe(true);
  });

  it('removes the worktree and deletes the branch when cleanup is worktree+branch', async () => {
    const fixture = await createCommittedFixture();

    const result = await fixture.service.merge(fixture.feature, fixture.task, 'merge', undefined, {
      cleanup: 'worktree+branch',
    });

    expect(result).toMatchObject({
      success: true,
      merged: true,
      strategy: 'merge',
      conflictState: 'none',
      cleanup: {
        worktreeRemoved: true,
        branchDeleted: true,
        pruned: true,
      },
    });
    expect(await pathExists(fixture.worktreePath)).toBe(false);
    expect(await branchExists(fixture.repoGit, 'hive/test-feature/01-test-task')).toBe(false);
  });

  it('aborts merge conflicts by default and reports the conflict state', async () => {
    const fixture = await createConflictingFixture();

    const result = await fixture.service.merge(fixture.feature, fixture.task, 'merge');

    expect(result).toMatchObject({
      success: false,
      merged: false,
      strategy: 'merge',
      filesChanged: ['tracked.txt'],
      conflicts: ['tracked.txt'],
      conflictState: 'aborted',
      cleanup: {
        worktreeRemoved: false,
        branchDeleted: false,
        pruned: false,
      },
      error: 'Merge conflicts detected',
    });
    const status = await fixture.repoGit.status();
    expect(status.conflicted).toEqual([]);
  });

  it('preserves merge conflicts when requested', async () => {
    const fixture = await createConflictingFixture();

    const result = await fixture.service.merge(fixture.feature, fixture.task, 'merge', undefined, {
      preserveConflicts: true,
    });

    expect(result).toMatchObject({
      success: false,
      merged: false,
      strategy: 'merge',
      filesChanged: ['tracked.txt'],
      conflicts: ['tracked.txt'],
      conflictState: 'preserved',
      cleanup: {
        worktreeRemoved: false,
        branchDeleted: false,
        pruned: false,
      },
      error: 'Merge conflicts detected',
    });
    const status = await fixture.repoGit.status();
    expect(status.conflicted).toContain('tracked.txt');
  });

  it("rejects rebase plus custom message", async () => {
    const fixture = await createCommittedFixture();

    expect(await fixture.service.merge(fixture.feature, fixture.task, "rebase", "feat: custom\n\nbody")).toEqual(
      {
        success: false,
        merged: false,
        strategy: 'rebase',
        filesChanged: [],
        conflicts: [],
        conflictState: 'none',
        cleanup: {
          worktreeRemoved: false,
          branchDeleted: false,
          pruned: false,
        },
        error: "Custom merge message is not supported for rebase strategy",
      },
    );
  });
});
