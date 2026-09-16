import mongoose from "mongoose";

export const PAYMENT_REUSE_WINDOW_MS = 30 * 60 * 1000;

export function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: number }).code === 11000
  );
}

export function makeTransactionId(userId: string, withSuffix = false): string {
  const prefix = process.env.PAYMENT_ORDER_PREFIX || "NOK";
  const base = `${prefix}-${Date.now()}-${String(userId).slice(-6)}`;
  if (!withSuffix) return base;
  const suffix = Math.floor(100 + Math.random() * 900);
  return `${base}-${suffix}`;
}

export function asObjectId(value: unknown): mongoose.Types.ObjectId | null {
  if (typeof value !== "string") return null;
  if (!mongoose.Types.ObjectId.isValid(value)) return null;
  return new mongoose.Types.ObjectId(value);
}

import { isCheckoutUrlValidForEnvironment } from "@/lib/paymentGateway/sslcommerz";

export { isCheckoutUrlValidForEnvironment };

export function getCheckoutUrlFromGatewayResponse(
  gatewayResponse: unknown,
): string | undefined {
  if (
    typeof gatewayResponse !== "object" ||
    gatewayResponse === null ||
    !("checkout_url" in gatewayResponse)
  ) {
    return undefined;
  }
  const url = (gatewayResponse as { checkout_url?: unknown }).checkout_url;
  return typeof url === "string" && url.trim() ? url.trim() : undefined;
}

export function amountsMatch(paid: number, expected: number): boolean {
  return Math.abs(paid - expected) < 0.01;
}

export function isPaymentEnvConfigured(): boolean {
  const storeId = process.env.SSLCOMMERZ_STORE_ID?.trim();
  const storePassword = process.env.SSLCOMMERZ_STORE_PASSWORD?.trim();
  return Boolean(storeId && storePassword);
}
