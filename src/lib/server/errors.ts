export type ApplicationErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "DATABASE_ERROR"
  | "INTERNAL_ERROR";

export class ApplicationError extends Error {
  constructor(
    message: string,
    readonly code: ApplicationErrorCode,
    readonly status: number,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "ApplicationError";
  }
}

export class UnauthenticatedError extends ApplicationError {
  constructor(message = "Authentication is required") {
    super(message, "UNAUTHENTICATED", 401);
    this.name = "UnauthenticatedError";
  }
}

export class ForbiddenError extends ApplicationError {
  constructor(message = "You do not have permission to perform this action") {
    super(message, "FORBIDDEN", 403);
    this.name = "ForbiddenError";
  }
}

export function normalizeDatabaseError(error: unknown, message = "The database request failed") {
  if (error instanceof ApplicationError) return error;
  if (error instanceof Error) {
    return new ApplicationError(message, "DATABASE_ERROR", 500, { cause: error });
  }
  return new ApplicationError(message, "DATABASE_ERROR", 500);
}
