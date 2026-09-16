import { describe, expect, it } from "vitest";
import { normalizeMeetLink, resolveMeetLink } from "@/lib/meetLink";

describe("normalizeMeetLink", () => {
  it("trims strings and treats other values as empty", () => {
    expect(normalizeMeetLink("  https://meet.google.com/abc  ")).toBe(
      "https://meet.google.com/abc",
    );
    expect(normalizeMeetLink("")).toBe("");
    expect(normalizeMeetLink(undefined)).toBe("");
    expect(normalizeMeetLink(null)).toBe("");
  });
});

describe("resolveMeetLink", () => {
  it("prefers the live-class link, then the batch link", () => {
    expect(
      resolveMeetLink("https://meet.google.com/live", "https://meet.google.com/batch"),
    ).toBe("https://meet.google.com/live");
    expect(resolveMeetLink("", "https://meet.google.com/batch")).toBe(
      "https://meet.google.com/batch",
    );
    expect(resolveMeetLink("  ", "  ")).toBeUndefined();
  });
});
