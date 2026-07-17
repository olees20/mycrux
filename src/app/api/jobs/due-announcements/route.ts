import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getServerEnvironment } from "@/env/server";
import { logger } from "@/lib/server/logger";
import { privilegedAccess } from "@/lib/supabase/admin";

function validSecret(request: NextRequest, expected: string) {
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const suppliedBytes = Buffer.from(supplied); const expectedBytes = Buffer.from(expected);
  return suppliedBytes.length === expectedBytes.length && timingSafeEqual(suppliedBytes, expectedBytes);
}

export async function GET(request: NextRequest) {
  const secret = getServerEnvironment().CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "Job is not configured" }, { status: 503 });
  if (!validSecret(request, secret)) {
    logger.write({ level: "warn", event: "due_announcement_job_denied" });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const processed = await privilegedAccess.processDueAnnouncements();
  return NextResponse.json({ processed });
}
