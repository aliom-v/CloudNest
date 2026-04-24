import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env.AUTH_ALLOWED_EMAILS = "admin@test.com, maintainer@test.com";
  process.env.ADMIN_SESSION_SECRET = "test-secret-key-for-testing-purposes-only";
  process.env.ADMIN_LOGIN_PASSWORD = "test-password";
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

test("auth exports are available", async () => {
  const auth = await import("../lib/auth.ts");
  assert.equal(typeof auth.createAdminSession, "function");
  assert.equal(typeof auth.verifyAdminSessionToken, "function");
  assert.equal(typeof auth.isAdminEmail, "function");
  assert.equal(typeof auth.getAllowedAdminEmails, "function");
  assert.ok(auth.ADMIN_SESSION_COOKIE);
});

test("getAllowedAdminEmails parses comma-separated env var", async () => {
  const { getAllowedAdminEmails } = await import("../lib/auth.ts");
  const emails = getAllowedAdminEmails();
  assert.deepEqual(emails, ["admin@test.com", "maintainer@test.com"]);
});

test("getAllowedAdminEmails returns empty array when env var is unset", async () => {
  process.env.AUTH_ALLOWED_EMAILS = "";
  const { getAllowedAdminEmails } = await import("../lib/auth.ts");
  assert.deepEqual(getAllowedAdminEmails(), []);
});

test("isAdminEmail matches whitelist case-insensitively", async () => {
  const { isAdminEmail } = await import("../lib/auth.ts");
  assert.equal(isAdminEmail("admin@test.com"), true);
  assert.equal(isAdminEmail("Admin@Test.Com"), true);
  assert.equal(isAdminEmail("unknown@test.com"), false);
});

test("isAdminEmail returns false for null or undefined", async () => {
  const { isAdminEmail } = await import("../lib/auth.ts");
  assert.equal(isAdminEmail(null), false);
  assert.equal(isAdminEmail(undefined), false);
});

test("createAdminSession generates a valid token", async () => {
  const { createAdminSession } = await import("../lib/auth.ts");
  const session = createAdminSession("admin@test.com");

  assert.ok(session.token);
  assert.ok(session.expiresAt);
  assert.match(session.token, /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
});

test("createAdminSession token can be verified", async () => {
  const { createAdminSession, verifyAdminSessionToken } = await import("../lib/auth.ts");
  const session = createAdminSession("admin@test.com");
  const payload = verifyAdminSessionToken(session.token);

  assert.ok(payload);
  assert.equal(payload.email, "admin@test.com");
  assert.ok(payload.exp > Math.floor(Date.now() / 1000));
});

test("verifyAdminSessionToken rejects tampered signature", async () => {
  const { createAdminSession, verifyAdminSessionToken } = await import("../lib/auth.ts");
  const session = createAdminSession("admin@test.com");

  const tampered = session.token.replace(/[A-Za-z0-9_-]{10}$/, "AAAAAAAAAA____");
  const payload = verifyAdminSessionToken(tampered);
  assert.equal(payload, null);
});

test("verifyAdminSessionToken rejects token with expired timestamp", async () => {
  const { verifyAdminSessionToken } = await import("../lib/auth.ts");
  const expiredPayload = Buffer.from(
    JSON.stringify({ email: "admin@test.com", exp: 100000 })
  ).toString("base64url");
  const crypto = await import("node:crypto");
  const hmac = crypto.createHmac("sha256", "test-secret-key-for-testing-purposes-only");
  hmac.update(expiredPayload);
  const signature = hmac.digest("base64url");
  const expiredToken = `${expiredPayload}.${signature}`;

  const payload = verifyAdminSessionToken(expiredToken);
  assert.equal(payload, null);
});

test("verifyAdminSessionToken rejects malformed token", async () => {
  const { verifyAdminSessionToken } = await import("../lib/auth.ts");
  assert.equal(verifyAdminSessionToken(""), null);
  assert.equal(verifyAdminSessionToken("not-a-dot-token"), null);
});

test("verifyAdminSessionToken rejects email not in whitelist", async () => {
  const { verifyAdminSessionToken } = await import("../lib/auth.ts");
  const payload = Buffer.from(
    JSON.stringify({ email: "hacker@evil.com", exp: Math.floor(Date.now() / 1000) + 3600 })
  ).toString("base64url");
  const crypto = await import("node:crypto");
  const hmac = crypto.createHmac("sha256", "test-secret-key-for-testing-purposes-only");
  hmac.update(payload);
  const signature = hmac.digest("base64url");
  const token = `${payload}.${signature}`;

  assert.equal(verifyAdminSessionToken(token), null);
});
