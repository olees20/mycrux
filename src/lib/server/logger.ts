import "server-only";

export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogContext = Readonly<Record<string, unknown>>;

export type LogEntry = Readonly<{
  level: LogLevel;
  event: string;
  context?: LogContext;
  error?: unknown;
}>;

export type StructuredLogger = Readonly<{
  write(entry: LogEntry): void;
}>;

const sensitiveKey = /authorization|cookie|password|secret|token|api.?key|(^|_)key$|signature|session|credential/i;
const bearerValue = /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi;
const jwtValue = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
const sensitiveQuery = /([?&](?:token|code|secret|signature|key)=)[^&\s]+/gi;

function sanitizeString(value: string) {
  const redacted = value
    .replace(bearerValue, "Bearer [REDACTED]")
    .replace(jwtValue, "[REDACTED_JWT]")
    .replace(sensitiveQuery, "$1[REDACTED]");
  return redacted.length > 4_000 ? `${redacted.slice(0, 4_000)}…[TRUNCATED]` : redacted;
}

function sanitize(value: unknown): unknown {
  if (typeof value === "string") return sanitizeString(value);
  if (Array.isArray(value)) return value.map(sanitize);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      sensitiveKey.test(key) ? "[REDACTED]" : sanitize(item),
    ]),
  );
}

export const logger: StructuredLogger = {
  write(entry) {
    const payload = JSON.stringify({
      timestamp: new Date().toISOString(),
      level: entry.level,
      event: entry.event,
      context: sanitize(entry.context),
      error: entry.error instanceof Error
        ? { name: entry.error.name, message: sanitizeString(entry.error.message) }
        : sanitize(entry.error),
    });

    if (entry.level === "error") console.error(payload);
    else if (entry.level === "warn") console.warn(payload);
    else console.info(payload);
  },
};
