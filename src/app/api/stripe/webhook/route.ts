import Stripe from "stripe";
import { getServerEnvironment } from "@/env/server";
import { errorReporter } from "@/lib/server/error-reporting";
import { logger } from "@/lib/server/logger";
import { observeOperation } from "@/lib/server/observability";
import { correlationIdFromRequest } from "@/lib/server/request-context";
import { subscriptionProjection, verifyStripeEvent } from "@/lib/stripe/server";
import { privilegedAccess } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const correlationId = correlationIdFromRequest(request);
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400, headers: { "x-request-id": correlationId } });
  const raw = await request.text();
  let event: Stripe.Event;
  try {
    event = verifyStripeEvent(raw, signature, getServerEnvironment().STRIPE_WEBHOOK_SECRET);
  } catch {
    logger.write({ level: "warn", event: "stripe_webhook_signature_rejected", correlationId });
    return new Response("Invalid signature", { status: 400, headers: { "x-request-id": correlationId } });
  }
  try {
    if (event.type.startsWith("customer.subscription.")) {
      const projection = subscriptionProjection(event.data.object as Stripe.Subscription);
      await observeOperation({ event: "stripe_subscription_webhook", correlationId, context: { eventId: event.id, eventType: event.type } }, () => privilegedAccess.applyStripeSubscriptionEvent({ eventId: event.id, eventType: event.type, livemode: event.livemode, ...projection }));
    } else {
      logger.write({ level: "info", event: "stripe_webhook_ignored", correlationId, context: { eventId: event.id, eventType: event.type } });
    }
    return new Response(null, { status: 200, headers: { "x-request-id": correlationId } });
  } catch (error) {
    await errorReporter.capture({ event: "stripe_webhook_processing_failed", correlationId, context: { eventId: event.id, eventType: event.type }, error });
    return new Response("Webhook processing failed", { status: 500, headers: { "x-request-id": correlationId } });
  }
}
