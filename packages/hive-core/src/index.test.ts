import { describe, expect, it } from "bun:test";
import { getHivePath } from "./utils/paths";

describe("hive-core", () => {
  it("exports path helpers", () => {
    expect(getHivePath("/tmp/project")).toBe("/tmp/project/.hive");
  });
});

