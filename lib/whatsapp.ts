export type WhatsAppLinkResult = {
  normalizedPhoneE164: string;
  waMePhone: string;
  encodedMessage: string;
  whatsappUrl: string;
};

const DEFAULT_COUNTRY_CODE = process.env.WHATSAPP_DEFAULT_COUNTRY_CODE?.trim() || "263";

export function buildWhatsAppLink(
  phone: string | null | undefined,
  message: string,
): WhatsAppLinkResult | null {
  if (!phone) return null;
  // strip spaces, dashes, brackets, dots, plus
  let digits = phone.replace(/[\s\-().+]/g, "");
  // local 0-prefix → country code
  if (digits.startsWith("0")) {
    digits = DEFAULT_COUNTRY_CODE + digits.slice(1);
  }
  // must be 7–15 digits
  if (!/^\d{7,15}$/.test(digits)) return null;
  const waMePhone = digits;
  const normalizedPhoneE164 = "+" + digits;
  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${waMePhone}?text=${encodedMessage}`;
  return { normalizedPhoneE164, waMePhone, encodedMessage, whatsappUrl };
}

export function appendClaimLink(message: string, claimUrl: string): string {
  if (message.includes(claimUrl)) return message;
  return message.trimEnd() + "\n\n" + claimUrl;
}
