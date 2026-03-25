import assert from "node:assert/strict";
import test from "node:test";

import {
  isPublicIdWithinUploadFolder,
  isPublicSignedUploadEnabled,
  isSameOriginRequest,
  normalizeUploadFolder
} from "../lib/upload-policy.ts";

test("normalizeUploadFolder removes extra slashes and whitespace", () => {
  assert.equal(normalizeUploadFolder(" /cloudnest/uploads// "), "cloudnest/uploads");
  assert.equal(normalizeUploadFolder("cloudnest/uploads"), "cloudnest/uploads");
});

test("isPublicIdWithinUploadFolder allows the configured folder and nested assets", () => {
  assert.equal(isPublicIdWithinUploadFolder("cloudnest/uploads/demo", "cloudnest/uploads"), true);
  assert.equal(isPublicIdWithinUploadFolder("cloudnest/uploads/nested/demo", "cloudnest/uploads"), true);
});

test("isPublicIdWithinUploadFolder rejects prefix collisions outside the folder boundary", () => {
  assert.equal(isPublicIdWithinUploadFolder("cloudnest/uploads-archive/demo", "cloudnest/uploads"), false);
  assert.equal(isPublicIdWithinUploadFolder("cloudnest/uploads_backup/demo", "cloudnest/uploads"), false);
});

test("isPublicSignedUploadEnabled requires both server config and explicit public flag", () => {
  assert.equal(isPublicSignedUploadEnabled(true, "true"), true);
  assert.equal(isPublicSignedUploadEnabled(true, undefined), false);
  assert.equal(isPublicSignedUploadEnabled(false, "true"), false);
});

test("isSameOriginRequest only accepts matching origin and host", () => {
  assert.equal(isSameOriginRequest("https://cloudnest.example", "cloudnest.example"), true);
  assert.equal(isSameOriginRequest("https://other.example", "cloudnest.example"), false);
  assert.equal(isSameOriginRequest(null, "cloudnest.example"), false);
});
