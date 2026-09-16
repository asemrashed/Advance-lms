export const TAKA_SYMBOL = "৳";

export function formatBdt(
  amount: number,
  options?: { minimumFractionDigits?: number; maximumFractionDigits?: number },
) {
  const { minimumFractionDigits = 0, maximumFractionDigits = 2 } = options ?? {};
  return `${TAKA_SYMBOL}${amount.toLocaleString("en-BD", {
    minimumFractionDigits,
    maximumFractionDigits,
  })}`;
}
