import { describe, expect, it } from "vitest";
import {
  confirmationPhrase,
  parseResetOptions,
  runReset,
  validateResetEnvironment,
} from "./reset-database-data.mjs";

const safeEnvironment = {
  ALLOW_DATABASE_RESET: "true",
  NEXT_PUBLIC_SUPABASE_URL: "https://example-project.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
  NODE_ENV: "development",
};

describe("database reset safeguards", () => {
  it("requires the explicit reset acknowledgement", () => {
    expect(() => validateResetEnvironment({ ...safeEnvironment, ALLOW_DATABASE_RESET: undefined }))
      .toThrow("ALLOW_DATABASE_RESET=true");
  });

  it("requires a second acknowledgement in production", () => {
    expect(() => validateResetEnvironment({ ...safeEnvironment, NODE_ENV: "production" }))
      .toThrow("ALLOW_PRODUCTION_DATABASE_RESET=true");
    expect(() => validateResetEnvironment({
      ...safeEnvironment,
      NODE_ENV: "production",
      ALLOW_PRODUCTION_DATABASE_RESET: "true",
    })).not.toThrow();
  });

  it("requires a distinct service-role key", () => {
    expect(() => validateResetEnvironment({ ...safeEnvironment, SUPABASE_SERVICE_ROLE_KEY: undefined }))
      .toThrow("SUPABASE_SERVICE_ROLE_KEY");
    expect(() => validateResetEnvironment({ ...safeEnvironment, SUPABASE_SERVICE_ROLE_KEY: "anon-key" }))
      .toThrow("must not be the public anonymous key");
  });

  it("uses a project- and mode-specific confirmation phrase", () => {
    expect(confirmationPhrase(safeEnvironment.NEXT_PUBLIC_SUPABASE_URL, false))
      .toBe("RESET MYCRUX APPLICATION DATA AT example-project.supabase.co");
    expect(confirmationPhrase(safeEnvironment.NEXT_PUBLIC_SUPABASE_URL, true))
      .toBe("RESET MYCRUX DATA AND AUTH USERS AT example-project.supabase.co");
  });

  it("rejects unsupported flags and non-interactive execution", async () => {
    expect(() => parseResetOptions(["--force"])).toThrow("Unknown reset option");
    await expect(runReset({
      environment: safeEnvironment,
      input: { isTTY: false },
      output: { isTTY: false, write() {} },
    })).rejects.toThrow("interactive terminal");
  });
});
