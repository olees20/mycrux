import "server-only";

import { logger, type LogContext } from "./logger";

export async function observeOperation<T>(input: Readonly<{
  event: string;
  correlationId?: string;
  context?: LogContext;
}>, operation: () => Promise<T>) {
  const startedAt = performance.now();
  try {
    const result = await operation();
    logger.write({ level: "info", event: `${input.event}_completed`, correlationId: input.correlationId, context: { ...input.context, durationMs: Math.round(performance.now() - startedAt) } });
    return result;
  } catch (error) {
    logger.write({ level: "error", event: `${input.event}_failed`, correlationId: input.correlationId, context: { ...input.context, durationMs: Math.round(performance.now() - startedAt) }, error });
    throw error;
  }
}
