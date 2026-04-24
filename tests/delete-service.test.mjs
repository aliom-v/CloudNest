import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = "test-cloud";
  process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET = "test-preset";
  process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_FOLDER = "test/uploads";
  process.env.AUTH_ALLOWED_EMAILS = "admin@test.com";
  process.env.ADMIN_SESSION_SECRET = "test-secret";
  process.env.ADMIN_LOGIN_PASSWORD = "test-password";
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

test("deleteManagedAsset rejects empty publicId", async () => {
  const { deleteManagedAsset } = await import("../lib/delete-service.ts");
  const result = await deleteManagedAsset({
    actorEmail: "admin@test.com",
    payload: { publicId: "", resourceType: "image" }
  });

  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(result.status, 400);
    assert.match(result.message, /publicId/);
  }
});

test("deleteManagedAsset rejects missing Cloudinary credentials", async () => {
  delete process.env.CLOUDINARY_API_KEY;
  delete process.env.CLOUDINARY_API_SECRET;

  const { deleteManagedAsset } = await import("../lib/delete-service.ts");
  const result = await deleteManagedAsset({
    actorEmail: "admin@test.com",
    payload: { publicId: "test/uploads/img1", resourceType: "image" }
  });

  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(result.status, 500);
    assert.match(result.message, /密钥/);
  }
});

test("deleteManagedAsset rejects publicId outside upload folder", async () => {
  process.env.CLOUDINARY_API_KEY = "test-key";
  process.env.CLOUDINARY_API_SECRET = "test-secret";

  const { deleteManagedAsset } = await import("../lib/delete-service.ts");
  const result = await deleteManagedAsset({
    actorEmail: "admin@test.com",
    payload: { publicId: "other-folder/img1", resourceType: "image" }
  });

  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(result.status, 400);
    assert.match(result.message, /目录/);
  }
});
