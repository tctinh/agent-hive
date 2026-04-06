import { describe, expect, it } from "bun:test";
import { CUSTOM_AGENT_RESERVED_NAMES, getHivePath } from "./index";
import { detectContext } from "./utils/detection";

describe("hive-core", () => {
  it("exports path helpers", () => {
    expect(getHivePath("/tmp/project")).toBe("/tmp/project/.hive");
  });

  it("detects worktree paths on Windows", () => {
    const result = detectContext("C:\\repo\\.hive\\.worktrees\\feature-x\\01-task");

    expect(result.isWorktree).toBe(true);
    expect(result.feature).toBe("feature-x");
    expect(result.task).toBe("01-task");
    expect(result.projectRoot).toBe("C:/repo");
  });

  it("keeps hive-helper reserved only once", () => {
    expect(CUSTOM_AGENT_RESERVED_NAMES.filter((name) => name === 'hive-helper')).toHaveLength(1);
  });
});
