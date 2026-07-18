import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { getServerEnvironment } from "@/env/server";
import { errorReporter } from "@/lib/server/error-reporting";
import { providerByKey } from "@/lib/integrations/providers";
import { logger } from "@/lib/server/logger";
import { observeOperation } from "@/lib/server/observability";
import { correlationIdFromRequest } from "@/lib/server/request-context";
import { privilegedAccess } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";

const paramsSchema = z.object({ provider: z.string().regex(/^[a-z][a-z0-9_.-]*$/), integrationId: z.uuid() });

export async function POST(request: Request, { params }: { params: Promise<{ provider: string; integrationId: string }> }) {
  const correlationId = correlationIdFromRequest(request);
  const parsed = paramsSchema.safeParse(await params);
  const secret = getServerEnvironment().INTEGRATION_WEBHOOK_SECRET;
  if (!parsed.success) return new Response("Not found", { status: 404, headers: { "x-request-id": correlationId } });
  const adapter = providerByKey(parsed.data.provider);
  if (!adapter?.available) return new Response("Adapter disabled", { status: 503, headers: { "x-request-id": correlationId } });
  if (!secret) return new Response("Webhook verification unavailable", { status: 503, headers: { "x-request-id": correlationId } });
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 1_048_576) return new Response("Payload too large", { status: 413, headers: { "x-request-id": correlationId } });
  const raw = await request.text();
  if (Buffer.byteLength(raw) > 1_048_576) return new Response("Payload too large", { status: 413, headers: { "x-request-id": correlationId } });
  const supplied = request.headers.get("x-crux-signature") ?? "";
  const expected = createHmac("sha256", secret).update(raw).digest("hex");
  const left = Buffer.from(supplied); const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    logger.write({ level: "warn", event: "integration_webhook_signature_rejected", correlationId, context: { provider: parsed.data.provider } });
    return new Response("Invalid signature", { status: 401, headers: { "x-request-id": correlationId } });
  }
  const eventKey = request.headers.get("x-crux-event-id");
  if (!eventKey || eventKey.length > 255) return new Response("Missing event id", { status: 400, headers: { "x-request-id": correlationId } });
  try {
    const connection = await privilegedAccess.getIntegrationForWebhook(parsed.data.integrationId, parsed.data.provider);
    if (!connection || !["configured", "active"].includes(connection.status)) return new Response("Integration unavailable", { status: 404, headers: { "x-request-id": correlationId } });
    let payload: unknown;
    try { payload = JSON.parse(raw); } catch { return new Response("Invalid JSON", { status: 400, headers: { "x-request-id": correlationId } }); }
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return new Response("Invalid payload", { status: 400, headers: { "x-request-id": correlationId } });
    const deliveryId = await observeOperation({ event: "integration_webhook_ingest", correlationId, context: { provider: parsed.data.provider, eventKey } }, () => privilegedAccess.ingestIntegrationDelivery(connection.id, connection.provider_key, eventKey, payload as Json));
    logger.write({ level: "info", event: "integration_webhook_accepted", correlationId, context: { provider: parsed.data.provider, deliveryId } });
    return new Response(null, { status: 202, headers: { "x-request-id": correlationId } });
  } catch (error) {
    await errorReporter.capture({ event: "integration_webhook_processing_failed", correlationId, context: { provider: parsed.data.provider, eventKey }, error });
    return new Response("Webhook processing failed", { status: 500, headers: { "x-request-id": correlationId } });
  }
}
