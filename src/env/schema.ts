import { z } from "zod";

const requiredString = (name: string) =>
  z.preprocess(
    (value) => value ?? "",
    z.string().min(1, `${name} is required`),
  );

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: requiredString("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  NEXT_PUBLIC_SITE_URL: z.url("NEXT_PUBLIC_SITE_URL must be a valid URL"),
});

const serverSchema = publicSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: requiredString("SUPABASE_SERVICE_ROLE_KEY"),
  STRIPE_SECRET_KEY: requiredString("STRIPE_SECRET_KEY"),
  STRIPE_WEBHOOK_SECRET: requiredString("STRIPE_WEBHOOK_SECRET"),
});

function parseEnvironment<T extends z.ZodType>(schema: T, values: unknown): z.infer<T> {
  const result = schema.safeParse(values);
  if (!result.success) {
    const details = result.error.issues.map((issue) => `- ${issue.path.join(".")}: ${issue.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${details}`);
  }
  return result.data;
}

export const parsePublicEnvironment = (values: unknown) => parseEnvironment(publicSchema, values);
export const parseServerEnvironment = (values: unknown) => parseEnvironment(serverSchema, values);
