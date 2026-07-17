import { z } from "zod";

const localPath = z.string().max(2048).refine(
  (value) => value.startsWith("/")
    && !value.startsWith("//")
    && !value.includes("\\")
    && !/[\u0000-\u001f\u007f]/.test(value),
  "Redirect path must be local",
);

export function safeRedirectPath(value: string | null | undefined, fallback = "/app") {
  const parsedFallback = localPath.parse(fallback);
  const result = localPath.safeParse(value);
  return result.success ? result.data : parsedFallback;
}
