/** Paid instant-access fee for admin platform QB (BDT). Set 0 for approval-only flow. */
export const PLATFORM_QB_ACCESS_FEE = Number(
  process.env.PLATFORM_QB_ACCESS_FEE ?? "500",
);

export function isPlatformQbPaidAccessEnabled(): boolean {
  return PLATFORM_QB_ACCESS_FEE > 0;
}
