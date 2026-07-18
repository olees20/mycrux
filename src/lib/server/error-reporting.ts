import "server-only";

import { logger, type LogContext } from "./logger";

export type ReportedServerError = Readonly<{
  event: string;
  error: unknown;
  correlationId?: string;
  context?: LogContext;
}>;

export type ErrorReportingProvider = Readonly<{
  capture(input: ReportedServerError): void | Promise<void>;
}>;

export function createErrorReporter(provider: ErrorReportingProvider) {
  return Object.freeze({
    async capture(input: ReportedServerError) {
      try {
        await provider.capture(input);
      } catch (adapterError) {
        logger.write({ level: "error", event: "error_reporting_adapter_failed", correlationId: input.correlationId, error: adapterError });
      }
    },
  });
}

// Replace this provider at the composition boundary when an external service is selected.
export const errorReporter = createErrorReporter({
  capture(input) {
    logger.write({ level: "error", ...input });
  },
});
