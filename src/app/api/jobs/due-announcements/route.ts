import { NextResponse, type NextRequest } from "next/server";
import { getServerEnvironment } from "@/env/server";
import { errorReporter } from "@/lib/server/error-reporting";
import { logger } from "@/lib/server/logger";
import { observeOperation } from "@/lib/server/observability";
import { hasValidBearerSecret } from "@/lib/server/request-auth";
import { correlationIdFromRequest } from "@/lib/server/request-context";
import { privilegedAccess } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const correlationId = correlationIdFromRequest(request);
  const secret = getServerEnvironment().CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "Job is not configured" }, { status: 503 });
  if (!hasValidBearerSecret(request, secret)) {
    logger.write({ level: "warn", event: "due_announcement_job_denied", correlationId });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const processed = await observeOperation({ event: "due_announcement_job", correlationId }, () => privilegedAccess.processDueAnnouncements());
    return NextResponse.json({ processed }, { headers: { "cache-control": "no-store", "x-request-id": correlationId } });
  } catch (error) {
    await errorReporter.capture({ event: "due_announcement_job_unhandled", correlationId, error });
    return NextResponse.json({ error: "Job failed" }, { status: 500, headers: { "cache-control": "no-store", "x-request-id": correlationId } });
  }
}
