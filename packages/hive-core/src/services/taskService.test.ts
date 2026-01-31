import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import { TaskService, TASK_STATUS_SCHEMA_VERSION } from "./taskService";
import { TaskStatus } from "../types";
import { getLockPath, readJson } from "../utils/paths";

const TEST_DIR = "/tmp/hive-core-taskservice-test-" + process.pid;
const PROJECT_ROOT = TEST_DIR;

function cleanup() {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true });
  }
}

function setupFeature(featureName: string): void {
  const featurePath = path.join(TEST_DIR, ".hive", "features", featureName);
  fs.mkdirSync(featurePath, { recursive: true });

  // Create a minimal feature.json
  fs.writeFileSync(
    path.join(featurePath, "feature.json"),
    JSON.stringify({ name: featureName, status: "executing", createdAt: new Date().toISOString() })
  );

  // Create plan.md with a task
  fs.writeFileSync(
    path.join(featurePath, "plan.md"),
    `# Plan\n\n### 1. Test Task\n\nDescription of the test task.\n`
  );
}

function setupTask(featureName: string, taskFolder: string, status: Partial<TaskStatus> = {}): void {
  const taskPath = path.join(TEST_DIR, ".hive", "features", featureName, "tasks", taskFolder);
  fs.mkdirSync(taskPath, { recursive: true });

  const taskStatus: TaskStatus = {
    status: "pending",
    origin: "plan",
    planTitle: "Test Task",
    ...status,
  };

  fs.writeFileSync(path.join(taskPath, "status.json"), JSON.stringify(taskStatus, null, 2));
}

describe("TaskService", () => {
  let service: TaskService;

  beforeEach(() => {
    cleanup();
    fs.mkdirSync(TEST_DIR, { recursive: true });
    service = new TaskService(PROJECT_ROOT);
  });

  afterEach(() => {
    cleanup();
  });

  describe("update", () => {
    it("updates task status with locked atomic write", () => {
      const featureName = "test-feature";
      setupFeature(featureName);
      setupTask(featureName, "01-test-task");

      const result = service.update(featureName, "01-test-task", {
        status: "in_progress",
      });

      expect(result.status).toBe("in_progress");
      expect(result.startedAt).toBeDefined();
      expect(result.schemaVersion).toBe(TASK_STATUS_SCHEMA_VERSION);

      // Verify no lock file remains
      const statusPath = path.join(
        TEST_DIR,
        ".hive",
        "features",
        featureName,
        "tasks",
        "01-test-task",
        "status.json"
      );
      expect(fs.existsSync(getLockPath(statusPath))).toBe(false);
    });

    it("sets completedAt when status is done", () => {
      const featureName = "test-feature";
      setupFeature(featureName);
      setupTask(featureName, "01-test-task", { startedAt: new Date().toISOString() });

      const result = service.update(featureName, "01-test-task", {
        status: "done",
        summary: "Task completed successfully",
      });

      expect(result.status).toBe("done");
      expect(result.completedAt).toBeDefined();
      expect(result.summary).toBe("Task completed successfully");
    });

    it("throws error for non-existent task", () => {
      const featureName = "test-feature";
      setupFeature(featureName);

      expect(() =>
        service.update(featureName, "nonexistent-task", { status: "in_progress" })
      ).toThrow(/not found/);
    });

    it("preserves existing fields on update", () => {
      const featureName = "test-feature";
      setupFeature(featureName);
      setupTask(featureName, "01-test-task", {
        planTitle: "Original Title",
        baseCommit: "abc123",
      });

      const result = service.update(featureName, "01-test-task", {
        status: "in_progress",
      });

      expect(result.planTitle).toBe("Original Title");
      expect(result.baseCommit).toBe("abc123");
    });
  });

  describe("patchBackgroundFields", () => {
    it("patches only background-owned fields", () => {
      const featureName = "test-feature";
      setupFeature(featureName);
      setupTask(featureName, "01-test-task", {
        status: "in_progress",
        summary: "Working on it",
      });

      const result = service.patchBackgroundFields(featureName, "01-test-task", {
        idempotencyKey: "key-123",
        workerSession: {
          sessionId: "session-abc",
          agent: "forager",
          mode: "delegate",
        },
      });

      // Background fields updated
      expect(result.idempotencyKey).toBe("key-123");
      expect(result.workerSession?.sessionId).toBe("session-abc");
      expect(result.workerSession?.agent).toBe("forager");
      expect(result.workerSession?.mode).toBe("delegate");

      // Completion-owned fields preserved
      expect(result.status).toBe("in_progress");
      expect(result.summary).toBe("Working on it");
    });

    it("deep merges workerSession fields", () => {
      const featureName = "test-feature";
      setupFeature(featureName);
      setupTask(featureName, "01-test-task", {
        workerSession: {
          sessionId: "session-abc",
          attempt: 1,
          messageCount: 5,
        },
      });

      // Patch only lastHeartbeatAt
      service.patchBackgroundFields(featureName, "01-test-task", {
        workerSession: {
          lastHeartbeatAt: "2025-01-23T00:00:00Z",
        } as any,
      });

      const result = service.getRawStatus(featureName, "01-test-task");

      // Original workerSession fields preserved
      expect(result?.workerSession?.sessionId).toBe("session-abc");
      expect(result?.workerSession?.attempt).toBe(1);
      expect(result?.workerSession?.messageCount).toBe(5);
      // New field added
      expect(result?.workerSession?.lastHeartbeatAt).toBe("2025-01-23T00:00:00Z");
    });

    it("does not clobber completion-owned fields", () => {
      const featureName = "test-feature";
      setupFeature(featureName);
      setupTask(featureName, "01-test-task", {
        status: "done",
        summary: "Completed successfully",
        completedAt: "2025-01-22T00:00:00Z",
      });

      // Background patch should not touch these
      service.patchBackgroundFields(featureName, "01-test-task", {
        workerSession: { sessionId: "new-session" },
      });

      const result = service.getRawStatus(featureName, "01-test-task");

      expect(result?.status).toBe("done");
      expect(result?.summary).toBe("Completed successfully");
      expect(result?.completedAt).toBe("2025-01-22T00:00:00Z");
    });

    it("sets schemaVersion on patch", () => {
      const featureName = "test-feature";
      setupFeature(featureName);
      setupTask(featureName, "01-test-task");

      const result = service.patchBackgroundFields(featureName, "01-test-task", {
        idempotencyKey: "key-456",
      });

      expect(result.schemaVersion).toBe(TASK_STATUS_SCHEMA_VERSION);
    });

    it("releases lock after patch", () => {
      const featureName = "test-feature";
      setupFeature(featureName);
      setupTask(featureName, "01-test-task");

      service.patchBackgroundFields(featureName, "01-test-task", {
        idempotencyKey: "test",
      });

      const statusPath = path.join(
        TEST_DIR,
        ".hive",
        "features",
        featureName,
        "tasks",
        "01-test-task",
        "status.json"
      );
      expect(fs.existsSync(getLockPath(statusPath))).toBe(false);
    });
  });

  describe("getRawStatus", () => {
    it("returns full TaskStatus including new fields", () => {
      const featureName = "test-feature";
      setupFeature(featureName);
      setupTask(featureName, "01-test-task", {
        schemaVersion: 1,
        idempotencyKey: "key-789",
        workerSession: {
          sessionId: "session-xyz",
          taskId: "bg-task-1",
          agent: "forager",
          mode: "delegate",
          attempt: 2,
        },
      });

      const result = service.getRawStatus(featureName, "01-test-task");

      expect(result).not.toBeNull();
      expect(result?.schemaVersion).toBe(1);
      expect(result?.idempotencyKey).toBe("key-789");
      expect(result?.workerSession?.sessionId).toBe("session-xyz");
      expect(result?.workerSession?.taskId).toBe("bg-task-1");
      expect(result?.workerSession?.agent).toBe("forager");
      expect(result?.workerSession?.mode).toBe("delegate");
      expect(result?.workerSession?.attempt).toBe(2);
    });

    it("returns null for non-existent task", () => {
      const featureName = "test-feature";
      setupFeature(featureName);

      const result = service.getRawStatus(featureName, "nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("dependsOn field", () => {
    it("existing tasks without dependsOn continue to load and display", () => {
      const featureName = "test-feature";
      setupFeature(featureName);
      // Create task without dependsOn (legacy format)
      setupTask(featureName, "01-test-task", {
        status: "pending",
        planTitle: "Test Task",
        // No dependsOn field
      });

      const result = service.getRawStatus(featureName, "01-test-task");

      expect(result).not.toBeNull();
      expect(result?.status).toBe("pending");
      expect(result?.planTitle).toBe("Test Task");
      // dependsOn should be undefined for legacy tasks
      expect(result?.dependsOn).toBeUndefined();
    });

    it("tasks with dependsOn array load correctly", () => {
      const featureName = "test-feature";
      setupFeature(featureName);
      setupTask(featureName, "02-dependent-task", {
        status: "pending",
        planTitle: "Dependent Task",
        dependsOn: ["01-setup", "01-core-api"],
      });

      const result = service.getRawStatus(featureName, "02-dependent-task");

      expect(result).not.toBeNull();
      expect(result?.dependsOn).toEqual(["01-setup", "01-core-api"]);
    });

    it("preserves dependsOn field on update", () => {
      const featureName = "test-feature";
      setupFeature(featureName);
      setupTask(featureName, "02-dependent-task", {
        status: "pending",
        dependsOn: ["01-setup"],
      });

      const result = service.update(featureName, "02-dependent-task", {
        status: "in_progress",
      });

      expect(result.status).toBe("in_progress");
      expect(result.dependsOn).toEqual(["01-setup"]);
    });

    it("handles empty dependsOn array", () => {
      const featureName = "test-feature";
      setupFeature(featureName);
      setupTask(featureName, "01-independent-task", {
        status: "pending",
        dependsOn: [],
      });

      const result = service.getRawStatus(featureName, "01-independent-task");

      expect(result).not.toBeNull();
      expect(result?.dependsOn).toEqual([]);
    });
  });

  describe("concurrent access safety", () => {
    it("handles rapid sequential updates without corruption", () => {
      const featureName = "test-feature";
      setupFeature(featureName);
      setupTask(featureName, "01-test-task");

      // Rapid sequential updates
      for (let i = 0; i < 10; i++) {
        service.patchBackgroundFields(featureName, "01-test-task", {
          workerSession: {
            sessionId: "session-1",
            messageCount: i,
          } as any,
        });
      }

      const result = service.getRawStatus(featureName, "01-test-task");

      // Last write wins
      expect(result?.workerSession?.messageCount).toBe(9);
      // File should be valid JSON
      const statusPath = path.join(
        TEST_DIR,
        ".hive",
        "features",
        featureName,
        "tasks",
        "01-test-task",
        "status.json"
      );
      expect(() => JSON.parse(fs.readFileSync(statusPath, "utf-8"))).not.toThrow();
    });
  });
});
