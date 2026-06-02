import assert from "node:assert/strict";

function appendClaimLink(message, claimUrl) {
  if (message.includes(claimUrl)) return message;
  return message.trimEnd() + "\n\n" + claimUrl;
}

function buildClaimUrl(baseUrl, rawToken) {
  return `${baseUrl.replace(/\/$/, "")}/claim/${rawToken}`;
}

function buildMessage(template, landlordName, claimUrl) {
  const interpolated = template
    .replace(/\{landlordName\}/g, landlordName)
    .replace(/\{claimLink\}/g, claimUrl);
  return appendClaimLink(interpolated, claimUrl);
}

function sanitizePdfText(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/\u00a0/g, " ")
    .replace(/[–—]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/…/g, "...")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "");
}

function normalizeUserIds(userIds) {
  return userIds
    .map((id) => (typeof id === "string" ? id.trim() : ""))
    .filter((id) => /^[a-f\d]{24}$/i.test(id));
}

function isEligibleUser(user, listing) {
  return (
    Boolean(listing) &&
    !["claimed", "onboarded"].includes(user.inviteStatus || "") &&
    ["imported_draft", "awaiting_landlord_claim"].includes(listing.status)
  );
}

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

console.log("\nbulk-pdf unit tests\n");

test("normalizeUserIds keeps valid object ids only", () => {
  const ids = normalizeUserIds([
    " 64d2d47f8c2c1a12a3456789 ",
    "not-valid",
    "",
    "64d2d47f8c2c1a12a3456788",
  ]);
  assert.equal(ids.length, 2);
});

test("buildClaimUrl trims trailing slash", () => {
  assert.equal(
    buildClaimUrl("https://sha.co.zw/", "abc123"),
    "https://sha.co.zw/claim/abc123",
  );
});

test("buildMessage interpolates landlord name and appends claim link once", () => {
  const url = "https://sha.co.zw/claim/abc123";
  const message = buildMessage("Hello {landlordName}, link: {claimLink}", "Tariro", url);
  assert.ok(message.includes("Tariro"));
  assert.equal(message.split(url).length - 1, 1);
});

test("sanitizePdfText strips characters that PDFKit may not encode", () => {
  assert.equal(
    sanitizePdfText("Mthuli’s Place – “Block A” …"),
    "Mthuli's Place - \"Block A\" ...",
  );
});

test("isEligibleUser matches the bulk export contract", () => {
  assert.equal(
    isEligibleUser(
      { inviteStatus: "imported" },
      { status: "imported_draft" },
    ),
    true,
  );
  assert.equal(
    isEligibleUser(
      { inviteStatus: "claimed" },
      { status: "imported_draft" },
    ),
    false,
  );
  assert.equal(
    isEligibleUser(
      { inviteStatus: "imported" },
      { status: "published" },
    ),
    false,
  );
});

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
