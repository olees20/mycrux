import {
  parseEnvironment,
  parsePublicEnvironment,
  publicSchema,
  requiredString,
} from "./public";

const serverSchema = publicSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: requiredString("SUPABASE_SERVICE_ROLE_KEY"),
  STRIPE_SECRET_KEY: requiredString("STRIPE_SECRET_KEY"),
  STRIPE_WEBHOOK_SECRET: requiredString("STRIPE_WEBHOOK_SECRET"),
});

export const parseServerEnvironment = (values: unknown) => parseEnvironment(serverSchema, values);
export { parsePublicEnvironment };
