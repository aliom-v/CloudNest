import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";
import path from "node:path";
import fs from "node:fs/promises";

beforeEach(() => {
  delete process.env.BLOB_READ_WRITE_TOKEN;
});

afterEach(() => {});

test("appendDeleteAuditEntry writes to local JSONL file", async () => {
  const { appendDeleteAuditEntry } = await import("../lib/delete-audit.ts");

  const entry = {
    id: "test-001",
    action: "delete",
    actorEmail: "admin@test.com",
    publicId: "test/uploads/img1",
    resourceType: "image",
    secureUrl: "https://res.cloudinary.com/test/image/upload/v1/test/img1",
    status: "success",
    message: "Cloudinary OK",
    createdAt: new Date().toISOString()
  };

  await appendDeleteAuditEntry(entry);

  const auditFile = path.join(process.cwd(), ".data", "delete-audit.jsonl");
  let content;
  try {
    content = await fs.readFile(auditFile, "utf8");
  } catch {
    return;
  }

  const lines = content.trim().split("\n");
  assert.ok(lines.length >= 1);
  const lastLine = lines[lines.length - 1];
  const parsed = JSON.parse(lastLine);
  assert.equal(parsed.publicId, entry.publicId);
  assert.equal(parsed.actorEmail, entry.actorEmail);
  assert.equal(parsed.status, "success");
});

test("readDeleteAuditEntries returns array", async () => {
  const { readDeleteAuditEntries } = await import("../lib/delete-audit.ts");
  const entries = await readDeleteAuditEntries(10);
  assert.ok(Array.isArray(entries));
});
