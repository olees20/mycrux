export type DayPassPaymentChoice = "pay_at_reception" | "integration_placeholder";
export type DayPassPaymentResult = { state: "unpaid" | "reserved"; externalReference: null };
export interface DayPassPaymentProvider { readonly id: string; reserve(choice: DayPassPaymentChoice): Promise<DayPassPaymentResult>; }

export const deferredGymPaymentProvider: DayPassPaymentProvider = Object.freeze({
  id: "gym-payment-not-connected",
  async reserve(choice: DayPassPaymentChoice): Promise<DayPassPaymentResult> { return { state: choice === "pay_at_reception" ? "unpaid" : "reserved", externalReference: null }; },
});

// Platform Stripe is intentionally absent. A future gym-owned provider implements
// DayPassPaymentProvider and writes only an external reference after gym consent.
