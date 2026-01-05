import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import * as fs from "fs/promises";
import * as path from "path";
import { StepService } from "./stepService";
import { FeatureService } from "./featureService";

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

async function setupFeature(tempDir: string): Promise<{ stepService: StepService; featureService: FeatureService }> {
  const featureService = new FeatureService(tempDir);
  const stepService = new StepService(tempDir, featureService);
  
  await featureService.create("test-feature", "Test ticket");
  
  return { stepService, featureService };
}

describe("StepService", () => {
  let tempDir: string;
  let stepService: StepService;
  let featureService: FeatureService;

  beforeEach(async () => {
    tempDir = await createTempDir();
    const setup = await setupFeature(tempDir);
    stepService = setup.stepService;
    featureService = setup.featureService;
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
  });

  describe("create", () => {
    test("creates step with folder structure", async () => {
      const result = await stepService.create("test-feature", "setup-db", 1, "Setup database");
      
      expect(result.folder).toBe("01-setup-db");
      
      const stepPath = path.join(tempDir, ".hive", "features", "test-feature", "execution", result.folder);
      const specPath = path.join(stepPath, "spec.md");
      const statusPath = path.join(stepPath, "status.json");
      
      const spec = await fs.readFile(specPath, "utf-8");
      expect(spec).toBe("Setup database");
      
      const status = JSON.parse(await fs.readFile(statusPath, "utf-8"));
      expect(status.name).toBe("setup-db");
      expect(status.order).toBe(1);
      expect(status.status).toBe("pending");
    });

    test("throws error for duplicate step", async () => {
      await stepService.create("test-feature", "setup-db", 1, "Setup");
      
      await expect(
        stepService.create("test-feature", "setup-db", 1, "Another")
      ).rejects.toThrow("already exists");
    });

    test("throws error for completed feature", async () => {
      await featureService.complete("test-feature");
      
      await expect(
        stepService.create("test-feature", "new-step", 2, "New step")
      ).rejects.toThrow("is completed");
    });
  });

  describe("read", () => {
    test("returns step with spec and status", async () => {
      await stepService.create("test-feature", "setup-db", 1, "Setup database");
      
      const step = await stepService.read("test-feature", "01-setup-db");
      
      expect(step).not.toBeNull();
      expect(step?.name).toBe("setup-db");
      expect(step?.order).toBe(1);
      expect(step?.status).toBe("pending");
      expect(step?.folder).toBe("01-setup-db");
      expect(step?.spec).toBe("Setup database");
    });

    test("returns null for non-existent step", async () => {
      const step = await stepService.read("test-feature", "nonexistent");
      expect(step).toBeNull();
    });
  });

  describe("list", () => {
    test("returns all steps sorted by folder name", async () => {
      await stepService.create("test-feature", "third", 3, "Third");
      await stepService.create("test-feature", "first", 1, "First");
      await stepService.create("test-feature", "second", 2, "Second");
      
      const steps = await stepService.list("test-feature");
      
      expect(steps.length).toBe(3);
      expect(steps[0].folder).toBe("01-first");
      expect(steps[1].folder).toBe("02-second");
      expect(steps[2].folder).toBe("03-third");
    });

    test("includes parallel steps with same order", async () => {
      await stepService.create("test-feature", "step-a", 1, "A");
      await stepService.create("test-feature", "step-b", 1, "B");
      await stepService.create("test-feature", "step-c", 2, "C");
      
      const steps = await stepService.list("test-feature");
      
      expect(steps.length).toBe(3);
      const batch1 = steps.filter(s => s.order === 1);
      expect(batch1.length).toBe(2);
    });
  });

  describe("update", () => {
    test("updates status and adds timestamps", async () => {
      const { folder } = await stepService.create("test-feature", "setup-db", 1, "Setup");
      
      await stepService.update("test-feature", folder, { status: "in_progress" });
      
      const step = await stepService.read("test-feature", folder);
      expect(step?.status).toBe("in_progress");
      expect(step?.startedAt).toBeDefined();
    });

    test("updates order and renames folder", async () => {
      const { folder } = await stepService.create("test-feature", "setup-db", 1, "Setup");
      
      const result = await stepService.update("test-feature", folder, { order: 5 });
      
      expect(result.newFolder).toBe("05-setup-db");
      
      const oldPath = path.join(tempDir, ".hive", "features", "test-feature", "execution", folder);
      const newPath = path.join(tempDir, ".hive", "features", "test-feature", "execution", result.newFolder!);
      
      const oldExists = await fs.access(oldPath).then(() => true).catch(() => false);
      const newExists = await fs.access(newPath).then(() => true).catch(() => false);
      
      expect(oldExists).toBe(false);
      expect(newExists).toBe(true);
      
      const step = await stepService.read("test-feature", result.newFolder!);
      expect(step?.order).toBe(5);
    });

    test("updates summary", async () => {
      const { folder } = await stepService.create("test-feature", "setup-db", 1, "Setup");
      
      await stepService.update("test-feature", folder, { summary: "Database configured" });
      
      const step = await stepService.read("test-feature", folder);
      expect(step?.summary).toBe("Database configured");
    });

    test("clears summary when clearSummary is true", async () => {
      const { folder } = await stepService.create("test-feature", "setup-db", 1, "Setup");
      await stepService.update("test-feature", folder, { summary: "Initial summary" });
      
      await stepService.update("test-feature", folder, { clearSummary: true });
      
      const step = await stepService.read("test-feature", folder);
      expect(step?.summary).toBeUndefined();
    });

    test("replaces spec content", async () => {
      const { folder } = await stepService.create("test-feature", "setup-db", 1, "Old spec");
      
      await stepService.update("test-feature", folder, { spec: "New spec content" });
      
      const step = await stepService.read("test-feature", folder);
      expect(step?.spec).toBe("New spec content");
    });

    test("throws error for completed feature", async () => {
      const { folder } = await stepService.create("test-feature", "setup-db", 1, "Setup");
      
      await featureService.complete("test-feature");
      
      await expect(
        stepService.update("test-feature", folder, { status: "in_progress" })
      ).rejects.toThrow("completed");
    });

    test("throws error for completed step", async () => {
      const { folder } = await stepService.create("test-feature", "setup-db", 1, "Setup");
      await stepService.update("test-feature", folder, { status: "done" });
      
      await expect(
        stepService.update("test-feature", folder, { status: "in_progress" })
      ).rejects.toThrow("cannot be modified");
    });
  });

  describe("delete", () => {
    test("deletes step folder", async () => {
      const { folder } = await stepService.create("test-feature", "setup-db", 1, "Setup");
      
      const result = await stepService.delete("test-feature", folder);
      
      expect(result.deleted).toBe(true);
      
      const stepPath = path.join(tempDir, ".hive", "features", "test-feature", "execution", folder);
      const exists = await fs.access(stepPath).then(() => true).catch(() => false);
      expect(exists).toBe(false);
    });

    test("throws error for completed feature", async () => {
      const { folder } = await stepService.create("test-feature", "setup-db", 1, "Setup");
      
      await featureService.complete("test-feature");
      
      await expect(
        stepService.delete("test-feature", folder)
      ).rejects.toThrow("completed");
    });

    test("throws error for non-existent step", async () => {
      await expect(
        stepService.delete("test-feature", "99-nonexistent")
      ).rejects.toThrow("not found");
    });
  });

  describe("getBatches", () => {
    test("groups steps by order and detects parallelism", async () => {
      await stepService.create("test-feature", "step-a", 1, "A");
      await stepService.create("test-feature", "step-b", 1, "B");
      await stepService.create("test-feature", "step-c", 2, "C");
      
      const batches = await stepService.getBatches("test-feature");
      
      expect(batches.length).toBe(2);
      expect(batches[0].order).toBe(1);
      expect(batches[0].parallel).toBe(true);
      expect(batches[0].steps.length).toBe(2);
      
      expect(batches[1].order).toBe(2);
      expect(batches[1].parallel).toBe(false);
      expect(batches[1].steps.length).toBe(1);
    });
  });

  describe("getNextPending", () => {
    test("returns earliest pending step", async () => {
      await stepService.create("test-feature", "first", 1, "First");
      await stepService.create("test-feature", "second", 2, "Second");
      await stepService.create("test-feature", "third", 3, "Third");
      
      const next = await stepService.getNextPending("test-feature");
      
      expect(next?.order).toBe(1);
      expect(next?.name).toBe("first");
    });

    test("skips in_progress steps", async () => {
      const { folder: firstFolder } = await stepService.create("test-feature", "first", 1, "First");
      await stepService.create("test-feature", "second", 2, "Second");
      
      await stepService.update("test-feature", firstFolder, { status: "in_progress" });
      
      const next = await stepService.getNextPending("test-feature");
      
      expect(next?.order).toBe(2);
      expect(next?.name).toBe("second");
    });

    test("returns null if no pending steps", async () => {
      const { folder } = await stepService.create("test-feature", "only-step", 1, "Only");
      await stepService.update("test-feature", folder, { status: "done" });
      
      const next = await stepService.getNextPending("test-feature");
      
      expect(next).toBeNull();
    });
  });

  describe("getByFolder", () => {
    test("finds step by folder name", async () => {
      await stepService.create("test-feature", "setup-db", 1, "Setup");
      
      const step = await stepService.getByFolder("test-feature", "01-setup-db");
      
      expect(step?.name).toBe("setup-db");
    });
  });

  describe("getByOrder", () => {
    test("finds steps by order number", async () => {
      await stepService.create("test-feature", "step-a", 1, "A");
      await stepService.create("test-feature", "step-b", 1, "B");
      await stepService.create("test-feature", "step-c", 2, "C");
      
      const batch1 = await stepService.getByOrder("test-feature", 1);
      const batch2 = await stepService.getByOrder("test-feature", 2);
      
      expect(batch1.length).toBe(2);
      expect(batch2.length).toBe(1);
    });
  });
});
