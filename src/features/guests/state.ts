export type GuestRegistrationState = { status:"idle"|"success"|"error";message?:string;waiverUrl?:string;passReference?:string;qrDataUrl?:string;validUntil?:string;paymentState?:"unpaid"|"reserved" };
export const initialGuestRegistrationState:GuestRegistrationState={status:"idle"};
export type PassVerificationState={status:"idle"|"success"|"error";message?:string;reference?:string;result?:{found:boolean;guestName?:string;passStatus?:string;paymentState?:string;waiversComplete?:boolean;validUntil?:string;registrationSource?:string}};
export const initialPassVerificationState:PassVerificationState={status:"idle"};
