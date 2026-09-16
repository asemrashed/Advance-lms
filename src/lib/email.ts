const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(input: string): string {
  return String(input || "").trim().toLowerCase();
}

export function isValidEmail(input: string): boolean {
  const email = normalizeEmail(input);
  return email.length > 0 && email.length <= 254 && EMAIL_RE.test(email);
}
