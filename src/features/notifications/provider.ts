import "server-only";

export type DeliveryEnvelope = Readonly<{
  gymId: string;
  category: "announcement" | "event";
  sourceId: string;
}>;

export interface NotificationDeliveryProvider {
  enqueue(envelope: DeliveryEnvelope): Promise<{ accepted: boolean }>;
}

class DeferredExternalDeliveryProvider implements NotificationDeliveryProvider {
  async enqueue(envelope: DeliveryEnvelope) {
    // Email/push vendors are intentionally not configured. In-app delivery is
    // generated transactionally in PostgreSQL; this boundary is ready for a job adapter.
    return { accepted: false, sourceId: envelope.sourceId };
  }
}

export const notificationDelivery = Object.freeze({
  external: new DeferredExternalDeliveryProvider() as NotificationDeliveryProvider,
});
