import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import * as fs from "fs/promises";
import * as path from "path";
import { WorktreeService, WorktreeConfig } from "./worktreeService";

async function createTempDir(): Promise<string> {
  const tempBase = path.join(process.cwd(), ".test-tmp");
  await fs.mkdir(tempBase, { recursive: true });
  const dir = path.join(tempBase, `test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

async function cleanupTempDir(dir: string): Promise<void> {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch {}
}

describe("WorktreeService.parseFilesFromDiff", () => {
  let tempDir: string;
  let service: WorktreeService;

  beforeEach(async () => {
    tempDir = await createTempDir();
    const config: WorktreeConfig = {
      baseDir: tempDir,
      hiveDir: path.join(tempDir, ".hive"),
    };
    await fs.mkdir(config.hiveDir, { recursive: true });
    service = new WorktreeService(config);
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
  });

  const parseFilesFromDiff = (svc: WorktreeService, content: string): string[] => {
    return (svc as any).parseFilesFromDiff(content);
  };

  test("parses standard git diff headers correctly", () => {
    const diffContent = `diff --git a/src/file1.ts b/src/file1.ts
index abc123..def456 100644
--- a/src/file1.ts
+++ b/src/file1.ts
@@ -1,3 +1,4 @@
+import { something } from './somewhere';
 const x = 1;
 const y = 2;
 const z = 3;
diff --git a/src/file2.ts b/src/file2.ts
index 111222..333444 100644
--- a/src/file2.ts
+++ b/src/file2.ts
@@ -5,6 +5,7 @@
 export function test() {
   return true;
 }
+// new comment`;

    const files = parseFilesFromDiff(service, diffContent);
    expect(files).toEqual(["src/file1.ts", "src/file2.ts"]);
  });

  test("returns unique files only", () => {
    const diffContent = `diff --git a/src/same.ts b/src/same.ts
--- a/src/same.ts
+++ b/src/same.ts
@@ -1 +1 @@
-old
+new
diff --git a/src/same.ts b/src/same.ts
--- a/src/same.ts
+++ b/src/same.ts
@@ -10 +10 @@
-another old
+another new`;

    const files = parseFilesFromDiff(service, diffContent);
    expect(files).toEqual(["src/same.ts"]);
  });

  test("handles empty diff content", () => {
    const files = parseFilesFromDiff(service, "");
    expect(files).toEqual([]);
  });

  test("handles diff with no file headers", () => {
    const diffContent = `Just some random text
that doesn't contain any diff headers
or file paths`;

    const files = parseFilesFromDiff(service, diffContent);
    expect(files).toEqual([]);
  });

  test("handles files with spaces in names", () => {
    const diffContent = `diff --git a/my file.ts b/my file.ts
--- a/my file.ts
+++ b/my file.ts
@@ -1 +1 @@
-old
+new`;

    const files = parseFilesFromDiff(service, diffContent);
    expect(files).toEqual(["my file.ts"]);
  });

  test("handles deeply nested paths", () => {
    const diffContent = `diff --git a/packages/opencode-hive/src/services/worktreeService.ts b/packages/opencode-hive/src/services/worktreeService.ts
--- a/packages/opencode-hive/src/services/worktreeService.ts
+++ b/packages/opencode-hive/src/services/worktreeService.ts
@@ -1,5 +1,6 @@
+// new comment
 import { exec } from "child_process";`;

    const files = parseFilesFromDiff(service, diffContent);
    expect(files).toEqual(["packages/opencode-hive/src/services/worktreeService.ts"]);
  });
});

describe("WorktreeService.revertFromSavedDiff", () => {
  let tempDir: string;
  let service: WorktreeService;
  let hiveDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
    hiveDir = path.join(tempDir, ".hive");
    await fs.mkdir(hiveDir, { recursive: true });
    await fs.mkdir(path.join(hiveDir, ".worktrees"), { recursive: true });

    const config: WorktreeConfig = {
      baseDir: tempDir,
      hiveDir: hiveDir,
    };
    service = new WorktreeService(config);
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
  });

  test("empty diff file returns success with no files affected", async () => {
    const diffPath = path.join(hiveDir, "empty.diff");
    await fs.writeFile(diffPath, "");

    const result = await service.revertFromSavedDiff(diffPath);

    expect(result.success).toBe(true);
    expect(result.filesAffected).toEqual([]);
    expect(result.error).toBeUndefined();
  });

  test("whitespace-only diff file returns success with no files affected", async () => {
    const diffPath = path.join(hiveDir, "whitespace.diff");
    await fs.writeFile(diffPath, "   \n\t\n   ");

    const result = await service.revertFromSavedDiff(diffPath);

    expect(result.success).toBe(true);
    expect(result.filesAffected).toEqual([]);
  });

  test("non-existent diff file throws error", async () => {
    const diffPath = path.join(hiveDir, "nonexistent.diff");

    await expect(service.revertFromSavedDiff(diffPath)).rejects.toThrow();
  });

  test("invalid diff content returns error", async () => {
    const diffPath = path.join(hiveDir, "invalid.diff");
    await fs.writeFile(diffPath, "this is not a valid diff format");

    const result = await service.revertFromSavedDiff(diffPath);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe("WorktreeService.checkConflictsFromSavedDiff", () => {
  let tempDir: string;
  let service: WorktreeService;
  let hiveDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
    hiveDir = path.join(tempDir, ".hive");
    await fs.mkdir(hiveDir, { recursive: true });
    await fs.mkdir(path.join(hiveDir, ".worktrees"), { recursive: true });

    const config: WorktreeConfig = {
      baseDir: tempDir,
      hiveDir: hiveDir,
    };
    service = new WorktreeService(config);
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
  });

  test("empty diff returns empty array", async () => {
    const diffPath = path.join(hiveDir, "empty.diff");
    await fs.writeFile(diffPath, "");

    const conflicts = await service.checkConflictsFromSavedDiff(diffPath);

    expect(conflicts).toEqual([]);
  });

  test("whitespace-only diff returns empty array", async () => {
    const diffPath = path.join(hiveDir, "whitespace.diff");
    await fs.writeFile(diffPath, "   \n\t\n   ");

    const conflicts = await service.checkConflictsFromSavedDiff(diffPath);

    expect(conflicts).toEqual([]);
  });

  test("non-existent diff file throws error", async () => {
    const diffPath = path.join(hiveDir, "nonexistent.diff");

    await expect(service.checkConflictsFromSavedDiff(diffPath)).rejects.toThrow();
  });

  test("reverse flag is accepted", async () => {
    const diffPath = path.join(hiveDir, "empty.diff");
    await fs.writeFile(diffPath, "");

    const conflicts = await service.checkConflictsFromSavedDiff(diffPath, true);
    expect(conflicts).toEqual([]);
  });
});
