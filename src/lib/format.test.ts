import { describe, expect, it } from "vitest";
import { clamp, formatDuration } from "./format";

describe("formatDuration", () => {
  it("formats minutes and seconds", () => {
    expect(formatDuration(185)).toBe("3:05");
  });

  it("formats long tracks", () => {
    expect(formatDuration(3723)).toBe("1:02:03");
  });

  it("handles unknown durations", () => {
    expect(formatDuration(null)).toBe("—");
  });
});

describe("clamp", () => {
  it("keeps a number inside its range", () => {
    expect(clamp(12, 0, 10)).toBe(10);
    expect(clamp(-1, 0, 10)).toBe(0);
  });
});
