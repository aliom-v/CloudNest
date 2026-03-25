function normalizeUploadFolderForSearch(input: string | undefined): string {
  return (input || "")
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .replace(/\/{2,}/g, "/");
}

export function buildCloudinarySearchExpression(input: {
  uploadFolder?: string;
  query: string;
}): string {
  const clauses = ["resource_type:image", "type=upload"];
  const normalizedFolder = normalizeUploadFolderForSearch(input.uploadFolder);
  const queryClause = buildCloudinaryQueryClause(input.query);

  if (normalizedFolder) {
    clauses.push(`public_id:${normalizedFolder}*`);
  }

  if (queryClause) {
    clauses.push(queryClause);
  }

  return clauses.join(" AND ");
}

function buildCloudinaryQueryClause(query: string): string {
  const sanitizedQuery = sanitizeCloudinarySearchInput(query);

  if (!sanitizedQuery) {
    return "";
  }

  const tokens = sanitizedQuery.split(/\s+/).filter(Boolean);
  const genericClause = tokens.join(" AND ");

  if (tokens.length === 1 && sanitizedQuery.includes("/")) {
    return `(${genericClause} OR public_id:${sanitizedQuery}*)`;
  }

  return `(${genericClause})`;
}

function sanitizeCloudinarySearchInput(query: string): string {
  return query
    .trim()
    .replace(/[^\p{L}\p{N}_.\/\s-]+/gu, " ")
    .replace(/[-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
