import { amountsMatch } from "@/app/api/_lib/paymentShared";
import {
  getValidationAmount,
  getValidationRecord,
  getValidationTranId,
  verifyPayment,
  verifyPaymentByValId,
} from "@/lib/paymentGateway/sslcommerz";

type PaymentVerifyInput = {
  gatewayOrderId?: string | null;
  transactionId: string;
  amount: number;
  valId?: string | null;
};

/** Server-side SSLCommerz validation — shared by validate + IPN routes. */
export async function verifyGatewayPayment(payment: PaymentVerifyInput) {
  const gatewayOrderId =
    typeof payment.gatewayOrderId === "string" && payment.gatewayOrderId.trim()
      ? payment.gatewayOrderId.trim()
      : payment.transactionId;

  const valId =
    typeof payment.valId === "string" && payment.valId.trim()
      ? payment.valId.trim()
      : "";

  const verificationResult = valId
    ? await verifyPaymentByValId(valId)
    : await verifyPayment(gatewayOrderId);

  const record = getValidationRecord(verificationResult.raw);
  const validatedTranId = getValidationTranId(record);
  const validatedAmount = getValidationAmount(record);
  const tranIdMatches =
    validatedTranId !== "" &&
    (validatedTranId === gatewayOrderId ||
      validatedTranId === payment.transactionId);
  const amountMatches =
    Number.isFinite(validatedAmount) &&
    amountsMatch(validatedAmount, Number(payment.amount));

  return {
    verified: verificationResult.success && tranIdMatches && amountMatches,
    raw: verificationResult.raw,
    gatewayOrderId,
  };
}
