import { NextResponse } from "next/server";
import { getServerEnvironment } from "@/env/server";
import { errorReporter } from "@/lib/server/error-reporting";
import { observeOperation } from "@/lib/server/observability";
import { hasValidBearerSecret } from "@/lib/server/request-auth";
import { correlationIdFromRequest } from "@/lib/server/request-context";
import { privilegedAccess } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const correlationId = correlationIdFromRequest(request);
  const secret = getServerEnvironment().CRON_SECRET;
  if (!secret || !hasValidBearerSecret(request, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "cache-control": "no-store", "x-request-id": correlationId } });
  }
  try {
    const deliveries = await observeOperation({ event: "integration_status_query", correlationId }, () => privilegedAccess.getIntegrationDeliveryHealth());
    const oldestAgeSeconds = deliveries.oldestQueuedAt ? Math.max(0, Math.round((Date.now() - new Date(deliveries.oldestQueuedAt).getTime()) / 1000)) : null;
    return NextResponse.json({ status: deliveries.deadLetter > 0 ? "degraded" : "ok", deliveries: { ...deliveries, oldestAgeSeconds } }, { headers: { "cache-control": "no-store", "x-request-id": correlationId } });
  } catch (error) {
    await errorReporter.capture({ event: "integration_status_failed", correlationId, error });
    return NextResponse.json({ status: "unavailable" }, { status: 503, headers: { "cache-control": "no-store", "x-request-id": correlationId } });
  }
}
