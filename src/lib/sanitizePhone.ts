/** Keeps digits only; allows a single leading + for country code. */
export function sanitizePhoneInput(raw: string): string {
  const trimmed = raw.trimStart();
  if (trimmed.startsWith("+")) {
    return `+${trimmed.slice(1).replace(/\D/g, "")}`;
  }
  return raw.replace(/\D/g, "");
}
