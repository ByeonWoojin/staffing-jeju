export function getKoreanMobilePhoneDigits(
  value: string | null | undefined,
): string | null {
  if (!value) return null;

  const digits = value.replace(/\D/g, "");
  const domesticPhone = digits.startsWith("82")
    ? `0${digits.slice(2)}`
    : digits;

  if (!/^01[016789]\d{7,8}$/.test(domesticPhone)) {
    return null;
  }

  return domesticPhone;
}

export function normalizeKoreanMobilePhone(
  value: string | null | undefined,
): string | null {
  const digits = getKoreanMobilePhoneDigits(value);
  if (!digits) return null;

  return digits.replace(/^(01[016789])(\d{3,4})(\d{4})$/, "$1-$2-$3");
}
