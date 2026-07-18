import { NextResponse } from "next/server";
import { errorReporter } from "@/lib/server/error-reporting";
import { observeOperation } from "@/lib/server/observability";
import { correlationIdFromRequest } from "@/lib/server/request-context";
import { privilegedAccess } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const correlationId = correlationIdFromRequest(request);
  try {
    await observeOperation({ event: "database_readiness_query", correlationId }, () => privilegedAccess.checkDatabaseHealth());
    return NextResponse.json({ status: "ready", checks: { database: "ok" } }, { headers: { "cache-control": "no-store", "x-request-id": correlationId } });
  } catch (error) {
    await errorReporter.capture({ event: "readiness_check_failed", correlationId, error });
    return NextResponse.json({ status: "unavailable", checks: { database: "failed" } }, { status: 503, headers: { "cache-control": "no-store", "x-request-id": correlationId } });
  }
}
