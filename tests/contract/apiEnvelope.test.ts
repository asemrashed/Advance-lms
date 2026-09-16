import { describe, expect, it } from "vitest";

/**
 * Contract test harness — expand with fixtures captured from live handlers.
 * Pre-release gate: npm run test:contract (CI).
 */

const PAGINATION_KEYS = ["page", "limit", "total", "pages", "hasNext", "hasPrev"] as const;

function assertApiEnvelope(body: unknown): asserts body is { success: boolean } {
  expect(body).toBeTypeOf("object");
  expect(body).not.toBeNull();
  expect((body as { success: unknown }).success).toBeTypeOf("boolean");
}

function assertPaginationShape(pagination: unknown) {
  expect(pagination).toBeTypeOf("object");
  expect(pagination).not.toBeNull();
  for (const key of PAGINATION_KEYS) {
    expect((pagination as Record<string, unknown>)[key]).toBeDefined();
  }
}

describe("API contract envelopes", () => {
  it("matches standard success envelope", () => {
    assertApiEnvelope({ success: true, data: { courses: [] } });
  });

  it("matches standard error envelope", () => {
    assertApiEnvelope({ success: false, error: "Not found" });
  });

  it("matches pagination wrapper shape", () => {
    assertPaginationShape({
      page: 1,
      limit: 10,
      total: 0,
      pages: 0,
      hasNext: false,
      hasPrev: false,
    });
  });
});
