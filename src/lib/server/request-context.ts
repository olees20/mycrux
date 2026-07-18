import "server-only";

import { randomUUID } from "node:crypto";

const validRequestId = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

export function correlationIdFromRequest(request: Request) {
  const supplied = request.headers.get("x-request-id")?.trim();
  return supplied && validRequestId.test(supplied) ? supplied : randomUUID();
}
