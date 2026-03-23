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

async function readHeadBody(targetPath: string): Promise<string> {
  const git = simpleGit(targetPath);
  const body = await git.raw(["log", "-1", "--format=%B"]);
  return body.trimEnd();
}

describe("WorktreeService merge and commit messages", () => {
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
    expect(await readHeadBody(fixture.repoPath)).toBe(message);
  });

  it("uses a custom squash message verbatim, including body text", async () => {
    const fixture = await createCommittedFixture();
    const message = "feat(core): squash task\n\nsquash body";

    const result = await fixture.service.merge(fixture.feature, fixture.task, "squash", message);

    expect(result.success).toBe(true);
    expect(await readHeadBody(fixture.repoPath)).toBe(message);
  });

  it("rejects rebase plus custom message", async () => {
    const fixture = await createCommittedFixture();

    expect(await fixture.service.merge(fixture.feature, fixture.task, "rebase", "feat: custom\n\nbody")).toEqual(
      {
        success: false,
        merged: false,
        error: "Custom merge message is not supported for rebase strategy",
      },
    );
  });
});
