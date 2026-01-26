import { describe, it, expect, spyOn } from "bun:test";
import { formatElapsed, formatRelativeTime } from "./format";

describe("formatElapsed", () => {
  it("formats seconds under a minute", () => {
    expect(formatElapsed(0)).toBe("0s");
    expect(formatElapsed(59_000)).toBe("59s");
  });

  it("formats minutes with seconds under an hour", () => {
    expect(formatElapsed(60_000)).toBe("1m 0s");
    expect(formatElapsed(61_000)).toBe("1m 1s");
    expect(formatElapsed(3_599_000)).toBe("59m 59s");
  });

  it("formats hours with minutes", () => {
    expect(formatElapsed(3_600_000)).toBe("1h 0m");
    expect(formatElapsed(3_660_000)).toBe("1h 1m");
    expect(formatElapsed(7_260_000)).toBe("2h 1m");
  });
});

describe("formatRelativeTime", () => {
  const NOW = 1_700_000_000_000;

  it("formats seconds ago", () => {
    const nowSpy = spyOn(Date, "now").mockReturnValue(NOW);
    const iso = new Date(NOW - 45_000).toISOString();

    expect(formatRelativeTime(iso)).toBe("45s ago");

    nowSpy.mockRestore();
  });

  it("formats minutes ago", () => {
    const nowSpy = spyOn(Date, "now").mockReturnValue(NOW);
    const iso = new Date(NOW - 5 * 60_000).toISOString();

    expect(formatRelativeTime(iso)).toBe("5m ago");

    nowSpy.mockRestore();
  });

  it("formats hours ago", () => {
    const nowSpy = spyOn(Date, "now").mockReturnValue(NOW);
    const iso = new Date(NOW - 2 * 60 * 60_000).toISOString();

    expect(formatRelativeTime(iso)).toBe("2h ago");

    nowSpy.mockRestore();
  });
});
