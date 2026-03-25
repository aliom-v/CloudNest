import assert from "node:assert/strict";
import test from "node:test";

import { buildCloudinarySearchExpression } from "../lib/cloudinary-search-policy.ts";

test("buildCloudinarySearchExpression scopes search to the configured upload folder", () => {
  const expression = buildCloudinarySearchExpression({
    uploadFolder: "cloudnest/uploads",
    query: "demo banner"
  });

  assert.match(expression, /resource_type:image/);
  assert.match(expression, /type=upload/);
  assert.match(expression, /public_id:cloudnest\/uploads\*/);
  assert.match(expression, /\(demo AND banner\)/);
});

test("buildCloudinarySearchExpression adds a public_id path branch for path-like queries", () => {
  const expression = buildCloudinarySearchExpression({
    uploadFolder: "cloudnest/uploads",
    query: "2026/03"
  });

  assert.match(expression, /\(2026\/03 OR public_id:2026\/03\*\)/);
});

test("buildCloudinarySearchExpression omits the query clause when the query is empty", () => {
  const expression = buildCloudinarySearchExpression({
    uploadFolder: "cloudnest/uploads",
    query: "   "
  });

  assert.equal(expression, "resource_type:image AND type=upload AND public_id:cloudnest/uploads*");
});
