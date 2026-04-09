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

    it("throws error for non-existent task without creating task folder", () => {
      const featureName = "test-feature";
      const missingTask = "nonexistent-task";
      setupFeature(featureName);
      const missingTaskPath = path.join(
        TEST_DIR,
        ".hive",
        "features",
        featureName,
        "tasks",
        missingTask
      );

      expect(fs.existsSync(missingTaskPath)).toBe(false);

      expect(() =>
        service.update(featureName, missingTask, { status: "in_progress" })
      ).toThrow(/not found/);

      expect(fs.existsSync(missingTaskPath)).toBe(false);
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
      expect(specContent).toContain("## Plan Section");
      expect(specContent).toContain("01-setup");
    });

    it("generates spec.md with Dependencies: none when explicitly empty", () => {
      const featureName = "test-feature";
      const featurePath = path.join(TEST_DIR, ".hive", "features", featureName);
      fs.mkdirSync(featurePath, { recursive: true });

      fs.writeFileSync(
        path.join(featurePath, "feature.json"),
        JSON.stringify({ name: featureName, status: "executing", createdAt: new Date().toISOString() })
      );

      const planContent = `# Plan

### 1. Independent Task

**Depends on**: none

Independent task.
`;
      fs.writeFileSync(path.join(featurePath, "plan.md"), planContent);

      service.sync(featureName);

      const specPath = path.join(featurePath, "tasks", "01-independent-task", "spec.md");
      const specContent = fs.readFileSync(specPath, "utf-8");

      expect(specContent).toContain("## Dependencies");
      expect(specContent).toContain("_None_");
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
    it("ignores a human-facing summary section before tasks", () => {
      const featureName = "test-feature";
      const featurePath = path.join(TEST_DIR, ".hive", "features", featureName);
      fs.mkdirSync(featurePath, { recursive: true });

      fs.writeFileSync(
        path.join(featurePath, "feature.json"),
        JSON.stringify({ name: featureName, status: "executing", createdAt: new Date().toISOString() })
      );

      const planContent = `# Plan

## Discovery

- Keep the plan human-friendly.

## Design Summary

This section helps humans review the plan before execution starts.

### Sequence Overview

- Setup first
- Build second

## Tasks

### 1. Setup

**Depends on**: none

Prepare the environment.

### 2. Build

**Depends on**: 1

Build the implementation.
`;
      fs.writeFileSync(path.join(featurePath, "plan.md"), planContent);

      const result = service.sync(featureName);

      expect(result.created).toEqual(["01-setup", "02-build"]);
      expect(service.getRawStatus(featureName, "01-setup")?.dependsOn).toEqual([]);
      expect(service.getRawStatus(featureName, "02-build")?.dependsOn).toEqual(["01-setup"]);
    });

    it("ignores optional mermaid blocks in the pre-task summary when parsing tasks and spec sections", () => {
      const featureName = "test-feature";
      const featurePath = path.join(TEST_DIR, ".hive", "features", featureName);
      fs.mkdirSync(featurePath, { recursive: true });

      fs.writeFileSync(
        path.join(featurePath, "feature.json"),
        JSON.stringify({ name: featureName, status: "executing", createdAt: new Date().toISOString() })
      );

      const planContent = `# Plan

## Design Summary

Quick sequence for humans.

\`\`\`mermaid
sequenceDiagram
    participant Human
    participant Hive
    Human->>Hive: Review summary
    Hive->>Human: Show tasks
\`\`\`

## Tasks

### 1. Setup

**Depends on**: none

Setup task.

### 2. Build

**Depends on**: 1

Build task.
`;
      fs.writeFileSync(path.join(featurePath, "plan.md"), planContent);

      const result = service.sync(featureName);

      expect(result.created).toEqual(["01-setup", "02-build"]);
      expect(service.getRawStatus(featureName, "02-build")?.dependsOn).toEqual(["01-setup"]);

      const specPath = path.join(featurePath, "tasks", "02-build", "spec.md");
      const specContent = fs.readFileSync(specPath, "utf-8");

      expect(specContent).toContain("### 2. Build");
      expect(specContent).not.toContain("sequenceDiagram");
      expect(specContent).not.toContain("### Sequence Overview");
    });

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

  describe("buildSpecContent - task type inference", () => {
    it("should infer greenfield type when plan section has only Create: files", () => {
      const featureName = "test-feature";
      const planContent = `# Plan

### 1. Greenfield Task

**Depends on**: none

**Files:**
- Create: \`packages/hive-core/src/new-module.ts\`

Create the new module.
`;

      const specContent = service.buildSpecContent({
        featureName,
        task: { folder: "01-greenfield-task", name: "Greenfield Task", order: 1 },
        dependsOn: [],
        allTasks: [{ folder: "01-greenfield-task", name: "Greenfield Task", order: 1 }],
        planContent,
      });

      expect(specContent).toContain("## Task Type");
      expect(specContent).toContain("greenfield");
    });

    it("should infer testing type when plan section has only Test: files", () => {
      const featureName = "test-feature";
      const planContent = `# Plan

### 1. Coverage Update

**Depends on**: none

**Files:**
- Test: \`packages/hive-core/src/services/taskService.test.ts\`

Add coverage for task specs.
`;

      const specContent = service.buildSpecContent({
        featureName,
        task: { folder: "01-coverage-update", name: "Coverage Update", order: 1 },
        dependsOn: [],
        allTasks: [{ folder: "01-coverage-update", name: "Coverage Update", order: 1 }],
        planContent,
      });

      expect(specContent).toContain("## Task Type");
      expect(specContent).toContain("testing");
    });

    it("should infer modification type when plan section has Modify: files", () => {
      const featureName = "test-feature";
      const planContent = `# Plan

### 1. Update Worker Prompt

**Depends on**: none

**Files:**
- Modify: \`packages/opencode-hive/src/agents/forager.ts\`

Update prompt copy.
`;

      const specContent = service.buildSpecContent({
        featureName,
        task: { folder: "01-update-worker-prompt", name: "Update Worker Prompt", order: 1 },
        dependsOn: [],
        allTasks: [{ folder: "01-update-worker-prompt", name: "Update Worker Prompt", order: 1 }],
        planContent,
      });

      expect(specContent).toContain("## Task Type");
      expect(specContent).toContain("modification");
    });

    it("should omit task type when no inference signal is present", () => {
      const featureName = "test-feature";
      const planContent = `# Plan

### 1. Align Docs

**Depends on**: none

Align documentation wording.
`;

      const specContent = service.buildSpecContent({
        featureName,
        task: { folder: "01-align-docs", name: "Align Docs", order: 1 },
        dependsOn: [],
        allTasks: [{ folder: "01-align-docs", name: "Align Docs", order: 1 }],
        planContent,
      });

      expect(specContent).not.toContain("## Task Type");
    });
  });

  describe("create() - manual task hardening", () => {
    it("writes dependsOn: [] by default for manual tasks", () => {
      const featureName = "test-feature";
      setupFeature(featureName);

      const folder = service.create(featureName, "ad-hoc-fix");

      const status = service.getRawStatus(featureName, folder);
      expect(status).not.toBeNull();
      expect(status?.origin).toBe("manual");
      expect(status?.dependsOn).toEqual([]);
    });

    it("creates a spec.md during manual-task creation", () => {
      const featureName = "test-feature";
      setupFeature(featureName);

      const folder = service.create(featureName, "ad-hoc-fix");

      const specPath = path.join(
        TEST_DIR,
        ".hive",
        "features",
        featureName,
        "tasks",
        folder,
        "spec.md"
      );
      expect(fs.existsSync(specPath)).toBe(true);
      const specContent = fs.readFileSync(specPath, "utf-8");
      expect(specContent).toContain("# Task:");
      expect(specContent).toContain("## Dependencies");
      expect(specContent).toContain("_None_");
    });

    it("accepts structured metadata and persists it in status.json", () => {
      const featureName = "test-feature";
      setupFeature(featureName);

      const folder = service.create(featureName, "review-fix", undefined, {
        description: "Fix routing issue found in review",
        goal: "Correct agent routing for swarm dispatch",
        acceptanceCriteria: ["swarm dispatches to correct agent", "existing tests pass"],
        references: ["packages/opencode-hive/src/agents/swarm.ts:107-111"],
        files: ["packages/opencode-hive/src/agents/swarm.ts"],
        reason: "Required by Hygienic review",
        source: "review",
      });

      const status = service.getRawStatus(featureName, folder);
      expect(status?.origin).toBe("manual");
      expect(status?.dependsOn).toEqual([]);
      expect((status as any).metadata?.description).toBe("Fix routing issue found in review");
      expect((status as any).metadata?.goal).toBe("Correct agent routing for swarm dispatch");
      expect((status as any).metadata?.acceptanceCriteria).toEqual([
        "swarm dispatches to correct agent",
        "existing tests pass",
      ]);
      expect((status as any).metadata?.source).toBe("review");
    });

    it("includes metadata in generated spec.md", () => {
      const featureName = "test-feature";
      setupFeature(featureName);

      const folder = service.create(featureName, "review-fix", undefined, {
        description: "Fix routing issue",
        goal: "Correct agent routing",
        acceptanceCriteria: ["tests pass"],
        references: ["packages/opencode-hive/src/agents/swarm.ts:107-111"],
        files: ["packages/opencode-hive/src/agents/swarm.ts"],
        reason: "Hygienic review",
        source: "review",
      });

      const specPath = path.join(
        TEST_DIR,
        ".hive",
        "features",
        featureName,
        "tasks",
        folder,
        "spec.md"
      );
      const specContent = fs.readFileSync(specPath, "utf-8");
      expect(specContent).toContain("Fix routing issue");
      expect(specContent).toContain("Correct agent routing");
      expect(specContent).toContain("tests pass");
      expect(specContent).toContain("swarm.ts");
    });

    it("accepts explicit dependsOn for manual tasks", () => {
      const featureName = "test-feature";
      setupFeature(featureName);
      setupTask(featureName, "01-setup", { status: "done", origin: "plan", dependsOn: [] });

      const folder = service.create(featureName, "follow-up", undefined, {
        dependsOn: ["01-setup"],
      });

      const status = service.getRawStatus(featureName, folder);
      expect(status?.dependsOn).toEqual(["01-setup"]);
    });

    it("accepts explicit order when it matches the next append-only slot", () => {
      const featureName = "test-feature";
      setupFeature(featureName);
      setupTask(featureName, "01-existing-task", { status: "done", origin: "plan", dependsOn: [] });

      const folder = service.create(featureName, "next-task", 2);

      expect(folder).toBe("02-next-task");
    });

    it("rejects explicit order lower than the next append-only slot", () => {
      const featureName = "test-feature";
      setupFeature(featureName);
      setupTask(featureName, "01-existing-task", { status: "done", origin: "plan", dependsOn: [] });

      expect(() => service.create(featureName, "inserted-task", 1)).toThrow(
        /append-only|intermediate insertion requires plan amendment|plan amendment/i
      );
    });

    it("rejects explicit order higher than the next append-only slot", () => {
      const featureName = "test-feature";
      setupFeature(featureName);
      setupTask(featureName, "01-existing-task", { status: "done", origin: "plan", dependsOn: [] });

      expect(() => service.create(featureName, "far-future-task", 99)).toThrow(
        /append-only|intermediate insertion requires plan amendment|plan amendment/i
      );
    });

    it("rejects explicit dependsOn when the target task is missing", () => {
      const featureName = "test-feature";
      setupFeature(featureName);

      expect(() =>
        service.create(featureName, "follow-up", undefined, {
          dependsOn: ["01-missing-task"],
        })
      ).toThrow(/append-only|dependencies on unfinished work require plan amendment|plan amendment/i);
    });

    it("rejects explicit dependsOn when the target task is not done", () => {
      const featureName = "test-feature";
      setupFeature(featureName);
      setupTask(featureName, "01-setup", { status: "pending", origin: "plan", dependsOn: [] });

      expect(() =>
        service.create(featureName, "follow-up", undefined, {
          dependsOn: ["01-setup"],
        })
      ).toThrow(/dependencies on unfinished work require plan amendment|plan amendment/i);
    });

    it("rejects explicit order that reuses an occupied non-append slot", () => {
      const featureName = "test-feature";
      setupFeature(featureName);
      setupTask(featureName, "05-existing-task", { status: "pending", origin: "plan", dependsOn: [] });

      expect(() => service.create(featureName, "new-task", 5)).toThrow(
        /append-only|intermediate insertion requires plan amendment|plan amendment/i
      );
    });

    it("rejects review-sourced manual tasks with explicit dependsOn", () => {
      const featureName = "test-feature";
      setupFeature(featureName);
      setupTask(featureName, "01-setup", { status: "done", origin: "plan", dependsOn: [] });

      expect(() =>
        service.create(featureName, "review-fix", undefined, {
          source: "review",
          dependsOn: ["01-setup"],
          description: "Fix found in review",
        })
      ).toThrow(/review.*dependsOn|dependsOn.*review|plan amendment/i);
    });

    it("allows review-sourced manual tasks without dependsOn", () => {
      const featureName = "test-feature";
      setupFeature(featureName);

      const folder = service.create(featureName, "review-fix", undefined, {
        source: "review",
        description: "Fix found in review",
      });

      const status = service.getRawStatus(featureName, folder);
      expect(status?.origin).toBe("manual");
      expect(status?.dependsOn).toEqual([]);
    });
  });

  describe("readSpec", () => {
    it("returns spec.md content for an existing task", () => {
      const featureName = "test-feature";
      setupFeature(featureName);

      const folder = service.create(featureName, "has-spec", undefined, {
        goal: "Verify readSpec returns the structured content",
        source: "review",
      });

      const spec = service.readSpec(featureName, folder);
      expect(spec).not.toBeNull();
      expect(spec).toContain("# Task:");
      expect(spec).toContain("Verify readSpec returns the structured content");
    });

    it("returns null for a task without spec.md", () => {
      const featureName = "test-feature";
      setupFeature(featureName);
      setupTask(featureName, "01-no-spec");

      const spec = service.readSpec(featureName, "01-no-spec");
      expect(spec).toBeNull();
    });
  });

  describe("sync() - refreshPending mode", () => {
    it("rewrites pending plan tasks when refreshPending is true", () => {
      const featureName = "test-feature";
      const featurePath = path.join(TEST_DIR, ".hive", "features", featureName);
      fs.mkdirSync(featurePath, { recursive: true });

      fs.writeFileSync(
        path.join(featurePath, "feature.json"),
        JSON.stringify({ name: featureName, status: "executing", createdAt: new Date().toISOString() })
      );

      const planV1 = `# Plan\n\n### 1. Setup\n\n**Depends on**: none\n\nSetup.\n\n### 2. Build\n\n**Depends on**: 1\n\nBuild.\n`;
      fs.writeFileSync(path.join(featurePath, "plan.md"), planV1);
      service.sync(featureName);

      const planV2 = `# Plan\n\n### 1. Setup\n\n**Depends on**: none\n\nSetup revised.\n\n### 2. Build\n\n**Depends on**: none\n\nBuild now independent.\n`;
      fs.writeFileSync(path.join(featurePath, "plan.md"), planV2);

      const result = service.sync(featureName, { refreshPending: true });

      const task2Status = service.getRawStatus(featureName, "02-build");
      expect(task2Status?.dependsOn).toEqual([]);
    });

    it("deletes pending plan tasks removed from plan when refreshPending is true", () => {
      const featureName = "test-feature";
      const featurePath = path.join(TEST_DIR, ".hive", "features", featureName);
      fs.mkdirSync(featurePath, { recursive: true });

      fs.writeFileSync(
        path.join(featurePath, "feature.json"),
        JSON.stringify({ name: featureName, status: "executing", createdAt: new Date().toISOString() })
      );

      const planV1 = `# Plan\n\n### 1. Setup\n\n**Depends on**: none\n\nSetup.\n\n### 2. Old Task\n\n**Depends on**: 1\n\nOld task.\n`;
      fs.writeFileSync(path.join(featurePath, "plan.md"), planV1);
      service.sync(featureName);

      const planV2 = `# Plan\n\n### 1. Setup\n\n**Depends on**: none\n\nSetup.\n`;
      fs.writeFileSync(path.join(featurePath, "plan.md"), planV2);

      const result = service.sync(featureName, { refreshPending: true });
      expect(result.removed).toContain("02-old-task");

      const oldTaskStatus = service.getRawStatus(featureName, "02-old-task");
      expect(oldTaskStatus).toBeNull();
    });

    it("preserves manual tasks during refreshPending sync", () => {
      const featureName = "test-feature";
      const featurePath = path.join(TEST_DIR, ".hive", "features", featureName);
      fs.mkdirSync(featurePath, { recursive: true });

      fs.writeFileSync(
        path.join(featurePath, "feature.json"),
        JSON.stringify({ name: featureName, status: "executing", createdAt: new Date().toISOString() })
      );

      const plan = `# Plan\n\n### 1. Setup\n\n**Depends on**: none\n\nSetup.\n`;
      fs.writeFileSync(path.join(featurePath, "plan.md"), plan);
      service.sync(featureName);

      service.create(featureName, "manual-fix");

      const result = service.sync(featureName, { refreshPending: true });
      expect(result.manual).toContain("02-manual-fix");

      const manualStatus = service.getRawStatus(featureName, "02-manual-fix");
      expect(manualStatus).not.toBeNull();
      expect(manualStatus?.origin).toBe("manual");
    });

    it("does not touch tasks with execution history during refreshPending", () => {
      const featureName = "test-feature";
      const featurePath = path.join(TEST_DIR, ".hive", "features", featureName);
      fs.mkdirSync(featurePath, { recursive: true });

      fs.writeFileSync(
        path.join(featurePath, "feature.json"),
        JSON.stringify({ name: featureName, status: "executing", createdAt: new Date().toISOString() })
      );

      const plan = `# Plan\n\n### 1. Setup\n\n**Depends on**: none\n\nSetup.\n\n### 2. Build\n\n**Depends on**: 1\n\nBuild.\n`;
      fs.writeFileSync(path.join(featurePath, "plan.md"), plan);
      service.sync(featureName);

      service.update(featureName, "01-setup", { status: "done", summary: "Done" });

      const planV2 = `# Plan\n\n### 1. Setup\n\n**Depends on**: none\n\nSetup revised.\n\n### 2. Build\n\n**Depends on**: none\n\nBuild revised.\n`;
      fs.writeFileSync(path.join(featurePath, "plan.md"), planV2);

      service.sync(featureName, { refreshPending: true });

      const setupStatus = service.getRawStatus(featureName, "01-setup");
      expect(setupStatus?.status).toBe("done");
      expect(setupStatus?.summary).toBe("Done");
    });

    it("refreshes planTitle and spec.md for pending plan tasks", () => {
      const featureName = "test-feature";
      const featurePath = path.join(TEST_DIR, ".hive", "features", featureName);
      fs.mkdirSync(featurePath, { recursive: true });

      fs.writeFileSync(
        path.join(featurePath, "feature.json"),
        JSON.stringify({ name: featureName, status: "executing", createdAt: new Date().toISOString() })
      );

      const planV1 = `# Plan\n\n### 1. Setup\n\n**Depends on**: none\n\nOld description.\n`;
      fs.writeFileSync(path.join(featurePath, "plan.md"), planV1);
      service.sync(featureName);

      const planV2 = `# Plan\n\n### 1. Setup\n\n**Depends on**: none\n\nNew description with changes.\n`;
      fs.writeFileSync(path.join(featurePath, "plan.md"), planV2);
      service.sync(featureName, { refreshPending: true });

      const specPath = path.join(featurePath, "tasks", "01-setup", "spec.md");
      const specContent = fs.readFileSync(specPath, "utf-8");
      expect(specContent).toContain("New description with changes");
    });

    it("preserves in_progress tasks during refreshPending", () => {
      const featureName = "test-feature";
      const featurePath = path.join(TEST_DIR, ".hive", "features", featureName);
      fs.mkdirSync(featurePath, { recursive: true });

      fs.writeFileSync(
        path.join(featurePath, "feature.json"),
        JSON.stringify({ name: featureName, status: "executing", createdAt: new Date().toISOString() })
      );

      const plan = `# Plan\n\n### 1. Setup\n\n**Depends on**: none\n\nSetup.\n\n### 2. Build\n\n**Depends on**: 1\n\nBuild.\n`;
      fs.writeFileSync(path.join(featurePath, "plan.md"), plan);
      service.sync(featureName);

      service.update(featureName, "02-build", { status: "in_progress" });

      const planV2 = `# Plan\n\n### 1. Setup\n\n**Depends on**: none\n\nSetup.\n`;
      fs.writeFileSync(path.join(featurePath, "plan.md"), planV2);

      service.sync(featureName, { refreshPending: true });

      const buildStatus = service.getRawStatus(featureName, "02-build");
      expect(buildStatus).not.toBeNull();
      expect(buildStatus?.status).toBe("in_progress");
    });

    it("preserves blocked/failed/partial tasks during refreshPending", () => {
      const featureName = "test-feature";
      const featurePath = path.join(TEST_DIR, ".hive", "features", featureName);
      fs.mkdirSync(featurePath, { recursive: true });

      fs.writeFileSync(
        path.join(featurePath, "feature.json"),
        JSON.stringify({ name: featureName, status: "executing", createdAt: new Date().toISOString() })
      );

      const plan = `# Plan\n\n### 1. TaskA\n\n**Depends on**: none\n\nA.\n\n### 2. TaskB\n\n**Depends on**: 1\n\nB.\n\n### 3. TaskC\n\n**Depends on**: 1\n\nC.\n`;
      fs.writeFileSync(path.join(featurePath, "plan.md"), plan);
      service.sync(featureName);

      service.update(featureName, "01-taska", { status: "blocked" });
      service.update(featureName, "02-taskb", { status: "failed" });
      service.update(featureName, "03-taskc", { status: "partial" });

      const planV2 = `# Plan\n\n### 1. NewTask\n\n**Depends on**: none\n\nNew.\n`;
      fs.writeFileSync(path.join(featurePath, "plan.md"), planV2);

      service.sync(featureName, { refreshPending: true });

      expect(service.getRawStatus(featureName, "01-taska")?.status).toBe("blocked");
      expect(service.getRawStatus(featureName, "02-taskb")?.status).toBe("failed");
      expect(service.getRawStatus(featureName, "03-taskc")?.status).toBe("partial");
    });
  });
});
