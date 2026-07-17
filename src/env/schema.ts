import {
  parseEnvironment,
  parsePublicEnvironment,
  publicSchema,
  requiredString,
} from "./public";
import { z } from "zod";

const serverSchema = publicSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: requiredString("SUPABASE_SERVICE_ROLE_KEY"),
  STRIPE_SECRET_KEY: requiredString("STRIPE_SECRET_KEY"),
  STRIPE_WEBHOOK_SECRET: requiredString("STRIPE_WEBHOOK_SECRET"),
  CRON_SECRET: z.string().min(24).optional(),
  INTEGRATION_WEBHOOK_SECRET: z.string().min(32).optional(),
  STRIPE_PLATFORM_PRICE_ID: z.string().regex(/^price_[A-Za-z0-9]+$/).optional(),
});

export const parseServerEnvironment = (values: unknown) => parseEnvironment(serverSchema, values);
export { parsePublicEnvironment };
