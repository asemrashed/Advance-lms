export { TEST_YOURSELF_FREE_LIMIT } from "@/lib/resources/access";

export const TEST_YOURSELF_VISIBLE_FILTER = {
  isActive: { $ne: false },
  accessPolicy: "public",
} as const;

/** Whether a platform question is published to Test Yourself (Phase 18.4). */
export function isPlatformQuestionInTestYourself(row: {
  isActive?: boolean;
  accessPolicy?: string;
}): boolean {
  return row.isActive !== false && row.accessPolicy === "public";
}
