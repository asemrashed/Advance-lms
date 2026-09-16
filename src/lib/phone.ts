/** Strip spaces, dashes, and parentheses from a phone string. */
export function stripPhoneFormatting(value: string): string {
  return String(value).replace(/[\s\-\(\)]/g, "");
}

/**
 * Normalize Bangladesh mobile numbers to local format: 01XXXXXXXXX (11 digits).
 * Accepts 01..., 8801..., or +8801...
 */
export function toBdLocalPhone(value: string): string {
  let phone = stripPhoneFormatting(value);
  if (phone.startsWith("+880")) {
    phone = `0${phone.slice(4)}`;
  } else if (phone.startsWith("880")) {
    phone = `0${phone.slice(3)}`;
  }
  return phone;
}

export function isValidBdPhone(value: string): boolean {
  return /^01\d{9}$/.test(toBdLocalPhone(value));
}

/** Lookup variants for matching phones stored in different formats. */
export function getBdPhoneLookupVariants(inputPhone: string): string[] {
  const raw = (inputPhone || "").trim();
  const clean = stripPhoneFormatting(raw);
  const local = toBdLocalPhone(raw);
  const digitsOnly = clean.replace(/\D/g, "");
  const variants = new Set<string>();

  if (clean) variants.add(clean);
  if (local) variants.add(local);
  if (digitsOnly) variants.add(digitsOnly);
  if (digitsOnly) variants.add(`+${digitsOnly}`);

  if (digitsOnly.startsWith("8801") && digitsOnly.length === 13) {
    const localFromIntl = `0${digitsOnly.slice(2)}`;
    variants.add(localFromIntl);
    variants.add(`+${digitsOnly}`);
  } else if (digitsOnly.startsWith("01") && digitsOnly.length === 11) {
    const intl = `88${digitsOnly}`;
    variants.add(intl);
    variants.add(`+${intl}`);
  } else if (digitsOnly.startsWith("1") && digitsOnly.length === 10) {
    const localFromShort = `0${digitsOnly}`;
    const intl = `880${digitsOnly}`;
    variants.add(localFromShort);
    variants.add(intl);
    variants.add(`+${intl}`);
  }

  return [...variants];
}
