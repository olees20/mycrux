export type IntegrationCategory="membership"|"check_in"|"payment"|"calendar";
export type NormalizedIntegrationEvent={externalId:string;eventType:string;occurredAt:string;data:Record<string,unknown>};
export interface IntegrationProvider{readonly key:string;readonly name:string;readonly category:IntegrationCategory;readonly available:boolean;normalizeWebhook(payload:unknown):NormalizedIntegrationEvent;}
function unavailable(key:string,name:string,category:IntegrationCategory):IntegrationProvider{return{key,name,category,available:false,normalizeWebhook(){throw new Error(`${name} adapter is disabled until its API contract is implemented`)}}}
export const integrationProviders=[unavailable("membership_placeholder","Membership provider", "membership"),unavailable("check_in_placeholder","Check-in provider","check_in"),unavailable("payment_placeholder","Gym payment provider","payment"),unavailable("calendar_placeholder","Calendar provider","calendar")]as const;
export function providerByKey(key:string){return integrationProviders.find(provider=>provider.key===key)}
