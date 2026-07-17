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

const sensitiveKey = /authorization|cookie|password|secret|token|key/i;

function sanitize(value: unknown): unknown {
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
        ? { name: entry.error.name, message: entry.error.message }
        : sanitize(entry.error),
    });

    if (entry.level === "error") console.error(payload);
    else if (entry.level === "warn") console.warn(payload);
    else console.info(payload);
  },
};
