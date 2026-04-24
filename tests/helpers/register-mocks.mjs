import { register } from "node:module";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function resolveAliasFile(root, relative) {
  const base = path.join(root, relative);
  for (const ext of [".ts", ".tsx", ".mjs", ".js"]) {
    const full = base + ext;
    try {
      fs.statSync(full);
      return full;
    } catch {}
  }
  return null;
}

const aliasPaths = [
  "lib/env", "lib/upload-policy", "lib/auth", "lib/cloudinary",
  "lib/cloudinary-search-policy", "lib/delete-audit", "lib/delete-service",
  "lib/formatters", "lib/recent-uploads", "lib/rate-limit",
  "types/api", "types/asset"
];

const aliasEntries = aliasPaths
  .map((rel) => {
    const filePath = resolveAliasFile(ROOT, rel);
    return filePath ? [`@/${rel}`, pathToFileURL(filePath).href] : null;
  })
  .filter(Boolean);

register(
  `data:text/javascript,${encodeURIComponent(`
const ALIAS_MAP = new Map(${JSON.stringify(aliasEntries)});
const MOCK_MODULES = new Map([
  ["next/headers", ${JSON.stringify("export const cookies = async () => ({ get: () => undefined });")}],
  ["server-only", ${JSON.stringify("export default {};")}],
  ["@vercel/blob", ${JSON.stringify("export const put = async () => {}; export const get = async () => null; export const list = async () => ({ blobs: [] });")}]
]);

export async function resolve(specifier, context, nextResolve) {
  if (MOCK_MODULES.has(specifier)) {
    return {
      format: "module",
      shortCircuit: true,
      url: "mock://" + encodeURIComponent(specifier)
    };
  }
  if (ALIAS_MAP.has(specifier)) {
    return nextResolve(ALIAS_MAP.get(specifier), context);
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.startsWith("mock://")) {
    const key = decodeURIComponent(url.slice("mock://".length));
    const source = MOCK_MODULES.get(key);
    if (source) {
      return { format: "module", shortCircuit: true, source };
    }
  }
  return nextLoad(url, context);
}
`)}`,
  import.meta.url
);
