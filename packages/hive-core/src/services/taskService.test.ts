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

  describe("sync() - dependency parsing", () => {
    it("parses explicit Depends on: annotations and resolves to folder names", () => {
      const featureName = "test-feature";
      const featurePath = path.join(TEST_DIR, ".hive", "features", featureName);
      fs.mkdirSync(featurePath, { recursive: true });

      fs.writeFileSync(
        path.join(featurePath, "feature.json"),
        JSON.stringify({ name: featureName, status: "executing", createdAt: new Date().toISOString() })
      );

      // Plan with explicit dependencies
      const planContent = `# Plan

### 1. Setup Base

Base setup task.

### 2. Build Core

**Depends on**: 1

Build the core module.

### 3. Build UI

**Depends on**: 1, 2

Build the UI layer.
`;
      fs.writeFileSync(path.join(featurePath, "plan.md"), planContent);

      const result = service.sync(featureName);

      expect(result.created).toContain("01-setup-base");
      expect(result.created).toContain("02-build-core");
      expect(result.created).toContain("03-build-ui");

      // Check status.json for dependencies
      const task1Status = service.getRawStatus(featureName, "01-setup-base");
      const task2Status = service.getRawStatus(featureName, "02-build-core");
      const task3Status = service.getRawStatus(featureName, "03-build-ui");

      // Task 1 has no dependencies (first task, implicit none)
      expect(task1Status?.dependsOn).toEqual([]);

      // Task 2 depends on task 1
      expect(task2Status?.dependsOn).toEqual(["01-setup-base"]);

      // Task 3 depends on tasks 1 and 2
      expect(task3Status?.dependsOn).toEqual(["01-setup-base", "02-build-core"]);
    });

    it("parses Depends on: none and produces empty dependency list", () => {
      const featureName = "test-feature";
      const featurePath = path.join(TEST_DIR, ".hive", "features", featureName);
      fs.mkdirSync(featurePath, { recursive: true });

      fs.writeFileSync(
        path.join(featurePath, "feature.json"),
        JSON.stringify({ name: featureName, status: "executing", createdAt: new Date().toISOString() })
      );

      const planContent = `# Plan

### 1. Independent Task A

**Depends on**: none

Can run independently.

### 2. Independent Task B

Depends on: none

Also independent.
`;
      fs.writeFileSync(path.join(featurePath, "plan.md"), planContent);

      const result = service.sync(featureName);

      const task1Status = service.getRawStatus(featureName, "01-independent-task-a");
      const task2Status = service.getRawStatus(featureName, "02-independent-task-b");

      expect(task1Status?.dependsOn).toEqual([]);
      expect(task2Status?.dependsOn).toEqual([]);
    });

    it("applies implicit sequential dependencies when Depends on: is missing", () => {
      const featureName = "test-feature";
      const featurePath = path.join(TEST_DIR, ".hive", "features", featureName);
      fs.mkdirSync(featurePath, { recursive: true });

      fs.writeFileSync(
        path.join(featurePath, "feature.json"),
        JSON.stringify({ name: featureName, status: "executing", createdAt: new Date().toISOString() })
      );

      // Plan without any dependency annotations - should use implicit sequential
      const planContent = `# Plan

### 1. First Task

Do the first thing.

### 2. Second Task

Do the second thing.

### 3. Third Task

Do the third thing.
`;
      fs.writeFileSync(path.join(featurePath, "plan.md"), planContent);

      const result = service.sync(featureName);

      const task1Status = service.getRawStatus(featureName, "01-first-task");
      const task2Status = service.getRawStatus(featureName, "02-second-task");
      const task3Status = service.getRawStatus(featureName, "03-third-task");

      // Task 1 - no dependencies (first task)
      expect(task1Status?.dependsOn).toEqual([]);

      // Task 2 - implicit dependency on task 1
      expect(task2Status?.dependsOn).toEqual(["01-first-task"]);

      // Task 3 - implicit dependency on task 2
      expect(task3Status?.dependsOn).toEqual(["02-second-task"]);
    });

    it("generates spec.md with dependency section", () => {
      const featureName = "test-feature";
      const featurePath = path.join(TEST_DIR, ".hive", "features", featureName);
      fs.mkdirSync(featurePath, { recursive: true });

      fs.writeFileSync(
        path.join(featurePath, "feature.json"),
        JSON.stringify({ name: featureName, status: "executing", createdAt: new Date().toISOString() })
      );

      const planContent = `# Plan

### 1. Setup

Setup task.

### 2. Build

**Depends on**: 1

Build task.
`;
      fs.writeFileSync(path.join(featurePath, "plan.md"), planContent);

      service.sync(featureName);

      // Read spec.md for task 2
      const specPath = path.join(featurePath, "tasks", "02-build", "spec.md");
      const specContent = fs.readFileSync(specPath, "utf-8");

      expect(specContent).toContain("## Dependencies");
      expect(specContent).toContain("01-setup");
    });

    it("handles mixed explicit and implicit dependencies", () => {
      const featureName = "test-feature";
      const featurePath = path.join(TEST_DIR, ".hive", "features", featureName);
      fs.mkdirSync(featurePath, { recursive: true });

      fs.writeFileSync(
        path.join(featurePath, "feature.json"),
        JSON.stringify({ name: featureName, status: "executing", createdAt: new Date().toISOString() })
      );

      const planContent = `# Plan

### 1. Base

Base task.

### 2. Core

No dependency annotation - implicit sequential.

### 3. UI

**Depends on**: 1

Explicitly depends only on 1, not 2.
`;
      fs.writeFileSync(path.join(featurePath, "plan.md"), planContent);

      service.sync(featureName);

      const task1Status = service.getRawStatus(featureName, "01-base");
      const task2Status = service.getRawStatus(featureName, "02-core");
      const task3Status = service.getRawStatus(featureName, "03-ui");

      // Task 1 - no dependencies
      expect(task1Status?.dependsOn).toEqual([]);

      // Task 2 - implicit dependency on task 1
      expect(task2Status?.dependsOn).toEqual(["01-base"]);

      // Task 3 - explicit dependency on task 1 only (not 2)
      expect(task3Status?.dependsOn).toEqual(["01-base"]);
    });
  });

  describe("sync() - dependency validation", () => {
    it("throws error for unknown task numbers in dependencies", () => {
      const featureName = "test-feature";
      const featurePath = path.join(TEST_DIR, ".hive", "features", featureName);
      fs.mkdirSync(featurePath, { recursive: true });

      fs.writeFileSync(
        path.join(featurePath, "feature.json"),
        JSON.stringify({ name: featureName, status: "executing", createdAt: new Date().toISOString() })
      );

      // Task 2 depends on non-existent task 99
      const planContent = `# Plan

### 1. First Task

First task description.

### 2. Second Task

**Depends on**: 1, 99

Second task depends on unknown task 99.
`;
      fs.writeFileSync(path.join(featurePath, "plan.md"), planContent);

      expect(() => service.sync(featureName)).toThrow(/unknown task number.*99/i);
    });

    it("throws error for self-dependency", () => {
      const featureName = "test-feature";
      const featurePath = path.join(TEST_DIR, ".hive", "features", featureName);
      fs.mkdirSync(featurePath, { recursive: true });

      fs.writeFileSync(
        path.join(featurePath, "feature.json"),
        JSON.stringify({ name: featureName, status: "executing", createdAt: new Date().toISOString() })
      );

      // Task 2 depends on itself
      const planContent = `# Plan

### 1. First Task

First task description.

### 2. Self Referential Task

**Depends on**: 2

This task depends on itself.
`;
      fs.writeFileSync(path.join(featurePath, "plan.md"), planContent);

      expect(() => service.sync(featureName)).toThrow(/self-dependency.*task 2/i);
    });

    it("throws error for cyclic dependencies (simple A->B->A)", () => {
      const featureName = "test-feature";
      const featurePath = path.join(TEST_DIR, ".hive", "features", featureName);
      fs.mkdirSync(featurePath, { recursive: true });

      fs.writeFileSync(
        path.join(featurePath, "feature.json"),
        JSON.stringify({ name: featureName, status: "executing", createdAt: new Date().toISOString() })
      );

      // Task 1 depends on task 2, task 2 depends on task 1
      const planContent = `# Plan

### 1. Task A

**Depends on**: 2

Task A depends on B.

### 2. Task B

**Depends on**: 1

Task B depends on A.
`;
      fs.writeFileSync(path.join(featurePath, "plan.md"), planContent);

      expect(() => service.sync(featureName)).toThrow(/cycle.*1.*2/i);
    });

    it("throws error for cyclic dependencies (longer chain A->B->C->A)", () => {
      const featureName = "test-feature";
      const featurePath = path.join(TEST_DIR, ".hive", "features", featureName);
      fs.mkdirSync(featurePath, { recursive: true });

      fs.writeFileSync(
        path.join(featurePath, "feature.json"),
        JSON.stringify({ name: featureName, status: "executing", createdAt: new Date().toISOString() })
      );

      // Cycle: 1->2->3->1
      const planContent = `# Plan

### 1. Task A

**Depends on**: 3

Task A depends on C.

### 2. Task B

**Depends on**: 1

Task B depends on A.

### 3. Task C

**Depends on**: 2

Task C depends on B.
`;
      fs.writeFileSync(path.join(featurePath, "plan.md"), planContent);

      expect(() => service.sync(featureName)).toThrow(/cycle/i);
    });

    it("error message for unknown deps points to plan.md", () => {
      const featureName = "test-feature";
      const featurePath = path.join(TEST_DIR, ".hive", "features", featureName);
      fs.mkdirSync(featurePath, { recursive: true });

      fs.writeFileSync(
        path.join(featurePath, "feature.json"),
        JSON.stringify({ name: featureName, status: "executing", createdAt: new Date().toISOString() })
      );

      const planContent = `# Plan

### 1. Only Task

**Depends on**: 5

Depends on non-existent task 5.
`;
      fs.writeFileSync(path.join(featurePath, "plan.md"), planContent);

      expect(() => service.sync(featureName)).toThrow(/plan\.md/i);
    });

    it("error message for cycle points to plan.md", () => {
      const featureName = "test-feature";
      const featurePath = path.join(TEST_DIR, ".hive", "features", featureName);
      fs.mkdirSync(featurePath, { recursive: true });

      fs.writeFileSync(
        path.join(featurePath, "feature.json"),
        JSON.stringify({ name: featureName, status: "executing", createdAt: new Date().toISOString() })
      );

      const planContent = `# Plan

### 1. Task A

**Depends on**: 2

Cycle with B.

### 2. Task B

**Depends on**: 1

Cycle with A.
`;
      fs.writeFileSync(path.join(featurePath, "plan.md"), planContent);

      expect(() => service.sync(featureName)).toThrow(/plan\.md/i);
    });

    it("accepts valid dependency graphs without cycles", () => {
      const featureName = "test-feature";
      const featurePath = path.join(TEST_DIR, ".hive", "features", featureName);
      fs.mkdirSync(featurePath, { recursive: true });

      fs.writeFileSync(
        path.join(featurePath, "feature.json"),
        JSON.stringify({ name: featureName, status: "executing", createdAt: new Date().toISOString() })
      );

      // Valid DAG: 1 <- 2, 1 <- 3, 2 <- 4, 3 <- 4
      const planContent = `# Plan

### 1. Base

**Depends on**: none

Base task.

### 2. Left Branch

**Depends on**: 1

Left branch.

### 3. Right Branch

**Depends on**: 1

Right branch.

### 4. Merge

**Depends on**: 2, 3

Merge both branches.
`;
      fs.writeFileSync(path.join(featurePath, "plan.md"), planContent);

      // Should not throw
      const result = service.sync(featureName);
      expect(result.created).toContain("01-base");
      expect(result.created).toContain("02-left-branch");
      expect(result.created).toContain("03-right-branch");
      expect(result.created).toContain("04-merge");
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

  describe("sync() - dependency parsing edge cases", () => {
    it("handles whitespace variations in Depends on line", () => {
      const featureName = "test-feature";
      const featurePath = path.join(TEST_DIR, ".hive", "features", featureName);
      fs.mkdirSync(featurePath, { recursive: true });

      fs.writeFileSync(
        path.join(featurePath, "feature.json"),
        JSON.stringify({ name: featureName, status: "executing", createdAt: new Date().toISOString() })
      );

      // Whitespace variations: extra spaces, tabs, etc.
      const planContent = `# Plan

### 1. Base Task

Base task.

### 2. Task With Spaces

**Depends on**:   1

Task with extra spaces after colon.

### 3. Task With Comma Spaces

**Depends on**: 1 , 2

Task with spaces around comma.
`;
      fs.writeFileSync(path.join(featurePath, "plan.md"), planContent);

      const result = service.sync(featureName);

      expect(result.created).toContain("01-base-task");
      expect(result.created).toContain("02-task-with-spaces");
      expect(result.created).toContain("03-task-with-comma-spaces");

      const task2Status = service.getRawStatus(featureName, "02-task-with-spaces");
      const task3Status = service.getRawStatus(featureName, "03-task-with-comma-spaces");

      expect(task2Status?.dependsOn).toEqual(["01-base-task"]);
      expect(task3Status?.dependsOn).toEqual(["01-base-task", "02-task-with-spaces"]);
    });

    it("handles non-bold Depends on format", () => {
      const featureName = "test-feature";
      const featurePath = path.join(TEST_DIR, ".hive", "features", featureName);
      fs.mkdirSync(featurePath, { recursive: true });

      fs.writeFileSync(
        path.join(featurePath, "feature.json"),
        JSON.stringify({ name: featureName, status: "executing", createdAt: new Date().toISOString() })
      );

      // Non-bold format
      const planContent = `# Plan

### 1. First

First task.

### 2. Second

Depends on: 1

Second depends on first (non-bold format).
`;
      fs.writeFileSync(path.join(featurePath, "plan.md"), planContent);

      const result = service.sync(featureName);

      const task2Status = service.getRawStatus(featureName, "02-second");
      expect(task2Status?.dependsOn).toEqual(["01-first"]);
    });

    it("handles case insensitive none keyword", () => {
      const featureName = "test-feature";
      const featurePath = path.join(TEST_DIR, ".hive", "features", featureName);
      fs.mkdirSync(featurePath, { recursive: true });

      fs.writeFileSync(
        path.join(featurePath, "feature.json"),
        JSON.stringify({ name: featureName, status: "executing", createdAt: new Date().toISOString() })
      );

      // "None" with capital N
      const planContent = `# Plan

### 1. Independent Task

**Depends on**: None

Independent task with capital None.
`;
      fs.writeFileSync(path.join(featurePath, "plan.md"), planContent);

      const result = service.sync(featureName);

      const task1Status = service.getRawStatus(featureName, "01-independent-task");
      expect(task1Status?.dependsOn).toEqual([]);
    });
  });

  describe("sync() - dependency validation edge cases", () => {
    it("allows forward dependencies (later task depending on earlier)", () => {
      const featureName = "test-feature";
      const featurePath = path.join(TEST_DIR, ".hive", "features", featureName);
      fs.mkdirSync(featurePath, { recursive: true });

      fs.writeFileSync(
        path.join(featurePath, "feature.json"),
        JSON.stringify({ name: featureName, status: "executing", createdAt: new Date().toISOString() })
      );

      // Normal forward dependency
      const planContent = `# Plan

### 1. Foundation

**Depends on**: none

Foundation task.

### 2. Build

**Depends on**: 1

Build depends on foundation.

### 3. Test

**Depends on**: 2

Test depends on build.
`;
      fs.writeFileSync(path.join(featurePath, "plan.md"), planContent);

      // Should not throw
      const result = service.sync(featureName);
      expect(result.created.length).toBe(3);
    });

    it("throws error for diamond with cycle", () => {
      const featureName = "test-feature";
      const featurePath = path.join(TEST_DIR, ".hive", "features", featureName);
      fs.mkdirSync(featurePath, { recursive: true });

      fs.writeFileSync(
        path.join(featurePath, "feature.json"),
        JSON.stringify({ name: featureName, status: "executing", createdAt: new Date().toISOString() })
      );

      // Diamond with cycle: 1->2, 1->3, 2->4, 3->4, 4->1
      const planContent = `# Plan

### 1. Start

**Depends on**: 4

Start depends on end (creates cycle).

### 2. Left

**Depends on**: 1

Left branch.

### 3. Right

**Depends on**: 1

Right branch.

### 4. End

**Depends on**: 2, 3

End depends on both branches.
`;
      fs.writeFileSync(path.join(featurePath, "plan.md"), planContent);

      expect(() => service.sync(featureName)).toThrow(/cycle/i);
    });

    it("provides clear error for multiple unknown dependencies", () => {
      const featureName = "test-feature";
      const featurePath = path.join(TEST_DIR, ".hive", "features", featureName);
      fs.mkdirSync(featurePath, { recursive: true });

      fs.writeFileSync(
        path.join(featurePath, "feature.json"),
        JSON.stringify({ name: featureName, status: "executing", createdAt: new Date().toISOString() })
      );

      // Multiple unknown task numbers
      const planContent = `# Plan

### 1. Only Task

**Depends on**: 5, 10, 99

Depends on multiple non-existent tasks.
`;
      fs.writeFileSync(path.join(featurePath, "plan.md"), planContent);

      expect(() => service.sync(featureName)).toThrow(/unknown.*task/i);
    });
  });
});
