import "server-only";
import { parseServerEnvironment } from "./schema";

export function getServerEnvironment() {
  return parseServerEnvironment({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    CRON_SECRET: process.env.CRON_SECRET,
    INTEGRATION_WEBHOOK_SECRET: process.env.INTEGRATION_WEBHOOK_SECRET,
    STRIPE_PLATFORM_PRICE_ID: process.env.STRIPE_PLATFORM_PRICE_ID,
  });
}
