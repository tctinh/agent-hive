import { describe, expect, it, beforeEach, afterEach, spyOn } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import {
  acquireLock,
  acquireLockSync,
  writeAtomic,
  writeJsonAtomic,
  writeJsonLocked,
  writeJsonLockedSync,
  patchJsonLocked,
  patchJsonLockedSync,
  deepMerge,
  getLockPath,
  readJson,
  normalizePath,
} from "./paths";

const TEST_DIR = "/tmp/hive-core-test-" + process.pid;

function cleanup() {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true });
  }
}

describe("Atomic + Locked JSON Utilities", () => {
  beforeEach(() => {
    cleanup();
    fs.mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    cleanup();
  });

  describe("acquireLock", () => {
    it("creates lock file and returns release function", async () => {
      const filePath = path.join(TEST_DIR, "test.json");
      const lockPath = getLockPath(filePath);

      const release = await acquireLock(filePath);

      expect(fs.existsSync(lockPath)).toBe(true);

      release();

      expect(fs.existsSync(lockPath)).toBe(false);
    });

    it("blocks second acquirer until lock is released", async () => {
      const filePath = path.join(TEST_DIR, "test.json");
      const order: string[] = [];

      const release1 = await acquireLock(filePath);
      order.push("lock1-acquired");

      // Start second lock attempt (will wait)
      const lock2Promise = acquireLock(filePath, { timeout: 1000 }).then(
        (release) => {
          order.push("lock2-acquired");
          return release;
        }
      );

      // Give lock2 a chance to attempt
      await new Promise((r) => setTimeout(r, 100));

      // Release first lock
      release1();
      order.push("lock1-released");

      // Wait for lock2
      const release2 = await lock2Promise;
      release2();
      order.push("lock2-released");

      expect(order).toEqual([
        "lock1-acquired",
        "lock1-released",
        "lock2-acquired",
        "lock2-released",
      ]);
    });

    it("times out when lock cannot be acquired", async () => {
      const filePath = path.join(TEST_DIR, "test.json");

      const release = await acquireLock(filePath);

      await expect(
        acquireLock(filePath, { timeout: 100, retryInterval: 10 })
      ).rejects.toThrow(/Failed to acquire lock/);

      release();
    });

    it("breaks stale lock after TTL", async () => {
      const filePath = path.join(TEST_DIR, "test.json");
      const lockPath = getLockPath(filePath);

      // Create a stale lock manually
      fs.writeFileSync(lockPath, JSON.stringify({ pid: 99999, stale: true }));
      // Set mtime to past
      const pastTime = new Date(Date.now() - 60000);
      fs.utimesSync(lockPath, pastTime, pastTime);

      // Should break stale lock and acquire
      const release = await acquireLock(filePath, { staleLockTTL: 1000 });

      expect(fs.existsSync(lockPath)).toBe(true);

      // Verify it's our lock (has current timestamp)
      const lockContent = JSON.parse(fs.readFileSync(lockPath, "utf-8"));
      expect(lockContent.pid).toBe(process.pid);

      release();
    });
  });

  describe("acquireLockSync", () => {
    it("creates lock file synchronously", () => {
      const filePath = path.join(TEST_DIR, "test.json");
      const lockPath = getLockPath(filePath);

      const release = acquireLockSync(filePath);

      expect(fs.existsSync(lockPath)).toBe(true);

      release();

      expect(fs.existsSync(lockPath)).toBe(false);
    });

    it("times out synchronously when lock held", () => {
      const filePath = path.join(TEST_DIR, "test.json");

      const release = acquireLockSync(filePath);

      expect(() =>
        acquireLockSync(filePath, { timeout: 100, retryInterval: 10 })
      ).toThrow(/Failed to acquire lock/);

      release();
    });
  });

  describe("writeAtomic", () => {
    it("writes file atomically via temp+rename", () => {
      const filePath = path.join(TEST_DIR, "atomic.txt");

      writeAtomic(filePath, "hello world");

      expect(fs.readFileSync(filePath, "utf-8")).toBe("hello world");
    });

    it("creates parent directories", () => {
      const filePath = path.join(TEST_DIR, "nested", "dir", "atomic.txt");

      writeAtomic(filePath, "nested content");

      expect(fs.readFileSync(filePath, "utf-8")).toBe("nested content");
    });

    it("cleans up temp file on failure", () => {
      const filePath = path.join(TEST_DIR, "readonly", "fail.txt");

      // Create readonly directory
      const readonlyDir = path.join(TEST_DIR, "readonly");
      fs.mkdirSync(readonlyDir);
      fs.chmodSync(readonlyDir, 0o444);

      try {
        expect(() => writeAtomic(filePath, "should fail")).toThrow();
      } finally {
        fs.chmodSync(readonlyDir, 0o755);
      }

      // No temp files should remain
      const files = fs.readdirSync(readonlyDir);
      expect(files.filter((f) => f.includes(".tmp."))).toHaveLength(0);
    });
  });

  describe("writeJsonAtomic", () => {
    it("writes JSON atomically with formatting", () => {
      const filePath = path.join(TEST_DIR, "data.json");
      const data = { foo: "bar", num: 42 };

      writeJsonAtomic(filePath, data);

      const content = fs.readFileSync(filePath, "utf-8");
      expect(JSON.parse(content)).toEqual(data);
      expect(content).toContain("\n"); // Formatted
    });
  });

  describe("writeJsonLocked", () => {
    it("writes JSON with lock protection", async () => {
      const filePath = path.join(TEST_DIR, "locked.json");
      const data = { key: "value" };

      await writeJsonLocked(filePath, data);

      expect(readJson<typeof data>(filePath)).toEqual(data);
      expect(fs.existsSync(getLockPath(filePath))).toBe(false);
    });

    it("serializes concurrent writes", async () => {
      const filePath = path.join(TEST_DIR, "concurrent.json");
      const writes: number[] = [];

      // Start multiple concurrent writes
      const promises = [1, 2, 3, 4, 5].map(async (n) => {
        await writeJsonLocked(filePath, { value: n });
        writes.push(n);
      });

      await Promise.all(promises);

      // All writes completed
      expect(writes).toHaveLength(5);

      // File has valid JSON (last writer wins)
      const final = readJson<{ value: number }>(filePath);
      expect(final?.value).toBeGreaterThanOrEqual(1);
      expect(final?.value).toBeLessThanOrEqual(5);
    });
  });

  describe("writeJsonLockedSync", () => {
    it("writes JSON with lock protection synchronously", () => {
      const filePath = path.join(TEST_DIR, "locked-sync.json");
      const data = { sync: true };

      writeJsonLockedSync(filePath, data);

      expect(readJson<typeof data>(filePath)).toEqual(data);
      expect(fs.existsSync(getLockPath(filePath))).toBe(false);
    });

    it("creates parent directories before lock acquisition", () => {
      const filePath = path.join(TEST_DIR, "nested", "deep", "locked-sync.json");
      const data = { nested: true };

      writeJsonLockedSync(filePath, data);

      expect(readJson<typeof data>(filePath)).toEqual(data);
      expect(fs.existsSync(getLockPath(filePath))).toBe(false);
    });
  });

  describe("ENOENT lock retries", () => {
    it("retries acquireLockSync when lock create gets transient ENOENT", () => {
      const filePath = path.join(TEST_DIR, "retry-lock.json");
      const lockPath = getLockPath(filePath);
      const originalOpenSync = fs.openSync.bind(fs);
      let firstAttempt = true;
      const openSpy = spyOn(fs, "openSync").mockImplementation(((targetPath: fs.PathLike, flags: number, mode?: fs.Mode) => {
        if (String(targetPath) === lockPath && firstAttempt) {
          firstAttempt = false;
          const err = new Error("Transient ENOENT") as NodeJS.ErrnoException;
          err.code = "ENOENT";
          throw err;
        }
        return originalOpenSync(targetPath, flags, mode);
      }) as typeof fs.openSync);

      try {
        const release = acquireLockSync(filePath, { timeout: 200, retryInterval: 1 });
        release();
      } finally {
        openSpy.mockRestore();
      }
    });
  });

  describe("deepMerge", () => {
    it("merges top-level fields", () => {
      const target: Record<string, unknown> = { a: 1, b: 2 };
      const patch: Record<string, unknown> = { b: 3, c: 4 };

      const result = deepMerge(target, patch);

      expect(result).toEqual({ a: 1, b: 3, c: 4 });
    });

    it("deep merges nested objects", () => {
      const target: Record<string, unknown> = {
        outer: { inner1: "a", inner2: "b" },
        other: "x",
      };
      const patch: Record<string, unknown> = {
        outer: { inner2: "c", inner3: "d" },
      };

      const result = deepMerge(target, patch);

      expect(result).toEqual({
        outer: { inner1: "a", inner2: "c", inner3: "d" },
        other: "x",
      });
    });

    it("replaces arrays (no merge)", () => {
      const target: Record<string, unknown> = { arr: [1, 2, 3] };
      const patch: Record<string, unknown> = { arr: [4, 5] };

      const result = deepMerge(target, patch);

      expect(result).toEqual({ arr: [4, 5] });
    });

    it("ignores undefined values in patch", () => {
      const target: Record<string, unknown> = { a: 1, b: 2 };
      const patch: Record<string, unknown> = { a: undefined, c: 3 };

      const result = deepMerge(target, patch);

      expect(result).toEqual({ a: 1, b: 2, c: 3 });
    });

    it("allows null to overwrite", () => {
      const target: Record<string, unknown> = { a: { nested: true } };
      const patch: Record<string, unknown> = { a: null };

      const result = deepMerge(target, patch);

      expect(result).toEqual({ a: null });
    });

    it("handles deeply nested objects", () => {
      const target: Record<string, unknown> = {
        level1: {
          level2: {
            level3: { keep: true, update: "old" },
          },
        },
      };
      const patch: Record<string, unknown> = {
        level1: {
          level2: {
            level3: { update: "new", add: true },
          },
        },
      };

      const result = deepMerge(target, patch);

      expect(result).toEqual({
        level1: {
          level2: {
            level3: { keep: true, update: "new", add: true },
          },
        },
      });
    });
  });

  describe("patchJsonLocked", () => {
    it("patches existing JSON file", async () => {
      const filePath = path.join(TEST_DIR, "patch.json");
      fs.writeFileSync(filePath, JSON.stringify({ a: 1, b: 2 }));

      const result = await patchJsonLocked<{ a: number; b: number; c?: number }>(
        filePath,
        { b: 3, c: 4 }
      );

      expect(result).toEqual({ a: 1, b: 3, c: 4 });
      expect(readJson<typeof result>(filePath)).toEqual({ a: 1, b: 3, c: 4 });
    });

    it("creates file if not exists", async () => {
      const filePath = path.join(TEST_DIR, "new-patch.json");

      const result = await patchJsonLocked<{ x: number }>(filePath, { x: 1 });

      expect(result).toEqual({ x: 1 });
    });

    it("deep merges nested objects in patch", async () => {
      const filePath = path.join(TEST_DIR, "nested-patch.json");
      fs.writeFileSync(
        filePath,
        JSON.stringify({
          status: "pending",
          workerSession: { sessionId: "abc", attempt: 1 },
        })
      );

      await patchJsonLocked(filePath, {
        workerSession: { lastHeartbeatAt: "2025-01-01T00:00:00Z" },
      });

      const result = readJson<Record<string, unknown>>(filePath);
      expect(result).toEqual({
        status: "pending",
        workerSession: {
          sessionId: "abc",
          attempt: 1,
          lastHeartbeatAt: "2025-01-01T00:00:00Z",
        },
      });
    });
  });

  describe("patchJsonLockedSync", () => {
    it("patches synchronously", () => {
      const filePath = path.join(TEST_DIR, "patch-sync.json");
      fs.writeFileSync(filePath, JSON.stringify({ x: 1 }));

      const result = patchJsonLockedSync<{ x: number; y?: number }>(filePath, {
        y: 2,
      });

      expect(result).toEqual({ x: 1, y: 2 });
    });
  });

  describe("normalizePath", () => {
    it("converts Windows backslashes to forward slashes", () => {
      expect(normalizePath("C:\\Users\\test\\project")).toBe("C:/Users/test/project");
    });

    it("leaves Unix paths unchanged", () => {
      expect(normalizePath("/home/user/project")).toBe("/home/user/project");
    });
  });
});
