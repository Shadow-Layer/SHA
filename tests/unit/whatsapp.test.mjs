import assert from "node:assert/strict";

// ── inline the normalizer logic (mirrors lib/whatsapp.ts) ──────────────────
const DEFAULT_COUNTRY_CODE = "263";

function buildWhatsAppLink(phone, message) {
  if (!phone) return null;
  let digits = phone.replace(/[\s\-().+]/g, "");
  if (digits.startsWith("0")) digits = DEFAULT_COUNTRY_CODE + digits.slice(1);
  if (!/^\d{7,15}$/.test(digits)) return null;
  const waMePhone = digits;
  const normalizedPhoneE164 = "+" + digits;
  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${waMePhone}?text=${encodedMessage}`;
  return { normalizedPhoneE164, waMePhone, encodedMessage, whatsappUrl };
}

function appendClaimLink(message, claimUrl) {
  if (message.includes(claimUrl)) return message;
  return message.trimEnd() + "\n\n" + claimUrl;
}
// ──────────────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

console.log("\nwhatsapp.ts unit tests\n");

test("Zimbabwe local 0-prefix → 263 prefix", () => {
  const r = buildWhatsAppLink("0771234567", "hi");
  assert.equal(r?.waMePhone, "263771234567");
  assert.equal(r?.normalizedPhoneE164, "+263771234567");
});

test("Already international +263 → same result", () => {
  const r = buildWhatsAppLink("+263771234567", "hi");
  assert.equal(r?.waMePhone, "263771234567");
});

test("Spaces and dashes stripped", () => {
  const r = buildWhatsAppLink("+263 77 123-4567", "hi");
  assert.equal(r?.waMePhone, "263771234567");
});

test("Too short (5 digits) → null", () => {
  assert.equal(buildWhatsAppLink("12345", "hi"), null);
});

test("Empty string → null", () => {
  assert.equal(buildWhatsAppLink("", "hi"), null);
});

test("null → null", () => {
  assert.equal(buildWhatsAppLink(null, "hi"), null);
});

test("URL encoding: & and = are encoded", () => {
  const r = buildWhatsAppLink("0771234567", "a=1&b=2");
  assert.ok(r?.encodedMessage.includes("%3D") || r?.encodedMessage.includes("%26"));
});

test("whatsappUrl starts with https://wa.me/", () => {
  const r = buildWhatsAppLink("0771234567", "hi");
  assert.ok(r?.whatsappUrl.startsWith("https://wa.me/"));
});

test("appendClaimLink appends when not present", () => {
  const result = appendClaimLink("Hello", "https://sha.co.zw/claim/abc");
  assert.ok(result.includes("https://sha.co.zw/claim/abc"));
});

test("appendClaimLink does NOT duplicate when already present", () => {
  const url = "https://sha.co.zw/claim/abc";
  const msg = "Hello\n\n" + url;
  const result = appendClaimLink(msg, url);
  assert.equal(result.split(url).length - 1, 1); // appears exactly once
});

test("global redaction: two {claimLink} occurrences both redacted", () => {
  const claimUrl = "https://sha.co.zw/claim/abc123token";
  const template = "Click {claimLink} or {claimLink} to claim.";
  // simulate server-side interpolation
  const interpolated = template.replace(/\{claimLink\}/g, claimUrl);
  // simulate global redaction
  const pattern = new RegExp(claimUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
  const redacted = interpolated.replace(pattern, "[CLAIM_LINK_REDACTED]");
  assert.ok(!redacted.includes(claimUrl), "raw claim URL must not appear in redacted string");
  assert.ok(redacted.includes("[CLAIM_LINK_REDACTED]"), "redaction placeholder must be present");
});

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
