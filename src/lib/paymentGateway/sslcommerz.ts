type InitiatePaymentInput = {
  amount: number;
  tran_id: string;
  cus_name: string;
  cus_email: string;
  cus_phone: string;
  cus_add1: string;
  cus_city: string;
};

type InitiatePaymentResult = {
  checkout_url: string;
  gatewayOrderId: string;
};

type VerifyPaymentResult = {
  success: boolean;
  raw: unknown;
};

export type SSLValidationRecord = Record<string, unknown>;

export function isSslSandboxMode(): boolean {
  const environment = readEnv("SSLCOMMERZ_ENVIRONMENT").toLowerCase();
  return environment !== "live";
}

export function isCheckoutUrlValidForEnvironment(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;

  try {
    const host = new URL(trimmed).hostname;
    if (isSslSandboxMode()) {
      return host === "sandbox.sslcommerz.com";
    }
    return (
      host === "epay-gw.sslcommerz.com" ||
      host === "securepay.sslcommerz.com"
    );
  } catch {
    return false;
  }
}

function isSandboxGatewayHost(url: string): boolean {
  try {
    return new URL(url).hostname === "sandbox.sslcommerz.com";
  } catch {
    return false;
  }
}

function isLiveGatewayHost(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "epay-gw.sslcommerz.com" || host === "securepay.sslcommerz.com";
  } catch {
    return false;
  }
}

function buildSandboxCheckoutUrl(sessionKey: string, baseUrl: string): string {
  const base = baseUrl.replace(/\/+$/, "");
  return `${base}/gwprocess/v4/gw.php?Q=PAY&SESSIONKEY=${encodeURIComponent(sessionKey)}`;
}

function resolveCheckoutUrl(
  payload: Record<string, unknown>,
  baseUrl: string,
): string {
  const sandbox = isSslSandboxMode();
  const sessionKey =
    typeof payload.sessionkey === "string" ? payload.sessionkey.trim() : "";

  const candidates = [
    payload.GatewayPageURL,
    payload.gatewayPageURL,
    payload.redirectGatewayURL,
    payload.directPaymentURL,
  ]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.trim());

  if (sandbox) {
    const sandboxUrl = candidates.find(isSandboxGatewayHost);
    if (sandboxUrl) return sandboxUrl;

    if (sessionKey) {
      return buildSandboxCheckoutUrl(sessionKey, baseUrl);
    }

    const liveGatewayUrl = candidates.find(isLiveGatewayHost);
    if (liveGatewayUrl) {
      throw new Error(
        "SSLCommerz returned a live gateway URL while SSLCOMMERZ_ENVIRONMENT=sandbox. Use sandbox store credentials from developer.sslcommerz.com.",
      );
    }
  } else {
    for (const url of candidates) {
      if (url) return url;
    }
  }

  const status = typeof payload.status === "string" ? payload.status : "UNKNOWN";
  const failedReason =
    typeof payload.failedreason === "string"
      ? payload.failedreason
      : typeof payload.failed_reason === "string"
        ? payload.failed_reason
        : "No failure reason provided";
  throw new Error(
    `SSLCommerz initiate failed: status=${status}, reason=${failedReason}`,
  );
}

function readEnv(...keys: string[]): string {
  for (const key of keys) {
    const value = process.env[key];
    if (value && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function requireEnv(label: string, ...keys: string[]): string {
  const value = readEnv(...(keys.length ? keys : [label]));
  if (!value) {
    throw new Error(`${label} is not configured`);
  }
  return value;
}

function readStoreId(): string {
  return requireEnv("SSLCOMMERZ_STORE_ID"); 
}

function readStorePassword(): string {
  return requireEnv(
    "SSLCOMMERZ_STORE_PASSWORD",
  );
}

function readBaseUrl(): string {
  const explicit = readEnv("SSL_BASE_URL");
  if (explicit) return explicit.replace(/\/+$/, "");

  const environment = readEnv("SSLCOMMERZ_ENVIRONMENT").toLowerCase();
  const fallback =
    environment === "live"
      ? readEnv("SSLCOMMERZ_LIVE_URL")
      : readEnv("SSLCOMMERZ_SANDBOX_URL");

  if (!fallback) {
    throw new Error("SSL base URL is not configured");
  }

  return fallback.replace(/\/+$/, "");
}

function readValidationUrl(): string {
  const explicit = readEnv("SSL_VALIDATION_URL");
  if (explicit) return explicit.replace(/\/+$/, "");

  return readBaseUrl();
}

function readSuccessUrl(): string {
  return requireEnv(
    "SSLCOMMERZ_SUCCESS_URL",
  );
}

function readFailUrl(): string {
  return requireEnv("SSLCOMMERZ_FAIL_URL");
}

function readCancelUrl(): string {
  return requireEnv(
    "SSLCOMMERZ_CANCEL_URL",
  );
}

function readIpnUrl(): string {
  return requireEnv("SSLCOMMERZ_IPN_URL");
}

async function parseJsonOrThrow(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error("SSLCommerz returned non-JSON response");
  }
}

export async function initiatePayment(
  input: InitiatePaymentInput,
): Promise<InitiatePaymentResult> {
  const storeId = readStoreId();
  const storePassword = readStorePassword();
  const baseUrl = readBaseUrl();

  const body = new URLSearchParams({
    store_id: storeId,
    store_passwd: storePassword,
    total_amount: String(input.amount),
    currency: "BDT",
    tran_id: input.tran_id,
    success_url: readSuccessUrl(),
    fail_url: readFailUrl(),
    cancel_url: readCancelUrl(),
    ipn_url: readIpnUrl(),
    cus_name: input.cus_name,
    cus_email: input.cus_email,
    cus_phone: input.cus_phone,
    cus_add1: input.cus_add1,
    cus_city: input.cus_city,
    product_name: "Course Enrollment",
    product_category: "Education",
    product_profile: "general",
    shipping_method: "NO",
  });

  const response = await fetch(`${baseUrl}/gwprocess/v4/api.php`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
    cache: "no-store",
  });

  const payload = (await parseJsonOrThrow(response)) as Record<string, unknown>;

  if (!response.ok) {
    throw new Error(`SSLCommerz initiate failed with status ${response.status}`);
  }

  const checkoutUrl = resolveCheckoutUrl(payload, baseUrl);

  return {
    checkout_url: checkoutUrl,
    gatewayOrderId: input.tran_id,
  };
}

function asRecord(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object") return raw as Record<string, unknown>;
  return {};
}

export function getValidationRecord(raw: unknown): SSLValidationRecord {
  if (Array.isArray(raw) && raw.length > 0) {
    return asRecord(raw[0]);
  }
  return asRecord(raw);
}

export function getValidationStatus(record: SSLValidationRecord): string {
  const status =
    typeof record.status === "string" ? record.status : "";
  return status.toUpperCase();
}

export function isSuccessfulValidation(raw: unknown): boolean {
  const record = getValidationRecord(raw);
  const status = getValidationStatus(record);
  return status === "VALID" || status === "VALIDATED";
}

export function getValidationTranId(record: SSLValidationRecord): string {
  if (typeof record.tran_id === "string") return record.tran_id.trim();
  return "";
}

export function getValidationAmount(record: SSLValidationRecord): number {
  if (typeof record.amount === "number") return record.amount;
  if (typeof record.amount === "string") return Number(record.amount);
  return Number.NaN;
}

export async function verifyPayment(tran_id: string): Promise<VerifyPaymentResult> {
  return verifyPaymentByTranId(tran_id);
}

export async function verifyPaymentByValId(val_id: string): Promise<VerifyPaymentResult> {
  if (!val_id || !val_id.trim()) {
    throw new Error("SSLCommerz verification requires val_id");
  }

  const validationBase = readValidationUrl();
  const storeId = readStoreId();
  const storePassword = readStorePassword();

  const query = new URLSearchParams({
    val_id: val_id.trim(),
    store_id: storeId,
    store_passwd: storePassword,
    v: "1",
    format: "json",
  });

  const response = await fetch(
    `${validationBase}/validator/api/validationserverAPI.php?${query.toString()}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    },
  );

  const payload = await parseJsonOrThrow(response);

  if (!response.ok) {
    throw new Error(`SSLCommerz verify failed with status ${response.status}`);
  }

  return {
    success: isSuccessfulValidation(payload),
    raw: payload,
  };
}

async function verifyPaymentByTranId(tran_id: string): Promise<VerifyPaymentResult> {
  if (!tran_id || !tran_id.trim()) {
    throw new Error("SSLCommerz verification requires tran_id");
  }

  const validationBase = readValidationUrl();
  const storeId = readStoreId();
  const storePassword = readStorePassword();

  const query = new URLSearchParams({
    store_id: storeId,
    store_passwd: storePassword,
    tran_id: tran_id.trim(),
    v: "1",
    format: "json",
  });

  const response = await fetch(
    `${validationBase}/validator/api/validationserverAPI.php?${query.toString()}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    },
  );

  const payload = await parseJsonOrThrow(response);

  if (!response.ok) {
    throw new Error(`SSLCommerz verify failed with status ${response.status}`);
  }

  return {
    success: isSuccessfulValidation(payload),
    raw: payload,
  };
}
