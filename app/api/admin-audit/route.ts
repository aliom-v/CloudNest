import { NextRequest, NextResponse } from "next/server";

import { authorizeAdminRequest } from "@/lib/auth";
import { readDeleteAuditEntries } from "@/lib/delete-audit";
import type { AdminAuditResult } from "@/types/api";

export async function GET(request: NextRequest) {
  const authorization = authorizeAdminRequest(request);

  if (!authorization.ok) {
    return NextResponse.json(
      {
        success: false,
        message: authorization.message
      },
      { status: authorization.status }
    );
  }

  const queryText = request.nextUrl.searchParams.get("q")?.trim().toLowerCase() || "";
  const status = request.nextUrl.searchParams.get("status") || "all";
  const rawLimit = Number(request.nextUrl.searchParams.get("limit") || "20");
  const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(rawLimit, 50)) : 20;
  const rawEntries = await readDeleteAuditEntries(queryText || status !== "all" ? Math.max(limit * 4, 40) : limit);
  const entries = rawEntries
    .filter((entry) => {
      const statusMatch = status === "all" ? true : entry.status === status;
      const queryMatch = queryText
        ? [entry.actorEmail, entry.publicId, entry.message]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(queryText)
        : true;

      return statusMatch && queryMatch;
    })
    .slice(0, limit);

  return NextResponse.json<{
    success: true;
    message: string;
    data: AdminAuditResult;
  }>({
    success: true,
    message: "Audit entries retrieved successfully",
    data: {
      entries
    }
  });
}
