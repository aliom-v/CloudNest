import "server-only";

import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";

import { get, list, put } from "@vercel/blob";

import type { DeleteAuditEntry } from "@/types/api";

const AUDIT_DIRECTORY = path.join(process.cwd(), ".data");
const AUDIT_FILE = path.join(AUDIT_DIRECTORY, "delete-audit.jsonl");
const AUDIT_BLOB_PREFIX = "audit/";

export async function appendDeleteAuditEntry(entry: DeleteAuditEntry) {
  if (shouldUseBlobAuditStore()) {
    await put(`${AUDIT_BLOB_PREFIX}${entry.createdAt}-${entry.id}.json`, JSON.stringify(entry), {
      access: "private",
      addRandomSuffix: false,
      contentType: "application/json"
    });

    return;
  }

  await mkdir(AUDIT_DIRECTORY, { recursive: true });
  await appendFile(AUDIT_FILE, `${JSON.stringify(entry)}\n`, "utf8");
}

export async function readDeleteAuditEntries(limit = 20): Promise<DeleteAuditEntry[]> {
  if (shouldUseBlobAuditStore()) {
    const result = await list({
      prefix: AUDIT_BLOB_PREFIX,
      limit: Math.min(Math.max(limit * 3, 20), 1000)
    });

    const blobs = [...result.blobs]
      .sort((left, right) => right.pathname.localeCompare(left.pathname))
      .slice(0, limit);

    const entries = await Promise.all(
      blobs.map(async (blob) => {
        const response = await get(blob.pathname, {
          access: "private"
        });

        if (!response || response.statusCode !== 200) {
          return null;
        }

        const raw = await new Response(response.stream).text();
        return JSON.parse(raw) as DeleteAuditEntry;
      })
    );

    return entries.filter((entry): entry is DeleteAuditEntry => Boolean(entry));
  }

  try {
    const raw = await readFile(AUDIT_FILE, "utf8");
    const lines = raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    return lines
      .slice(-limit)
      .reverse()
      .map((line) => JSON.parse(line) as DeleteAuditEntry);
  } catch {
    return [];
  }
}

function shouldUseBlobAuditStore(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}
