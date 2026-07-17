import"server-only";import Stripe from"stripe";import{getServerEnvironment}from"@/env/server";import{subscriptionProjection,verifyStripeEventWithClient}from"./webhook";
export{subscriptionProjection};
export function createStripeClient(){return new Stripe(getServerEnvironment().STRIPE_SECRET_KEY,{appInfo:{name:"Crux gym platform",version:"0.1.0"}})}
export function platformPriceId(){const price=getServerEnvironment().STRIPE_PLATFORM_PRICE_ID;if(!price)throw new Error("STRIPE_PLATFORM_PRICE_ID is not configured");return price;}
export function verifyStripeEvent(raw:string,signature:string,secret:string,stripe=createStripeClient()){return verifyStripeEventWithClient(raw,signature,secret,stripe)}
