import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Supabase client boundaries", () => {
  it("keeps privileged configuration out of browser modules", async () => {
    const browserModule = await readFile(resolve("src/lib/supabase/browser.ts"), "utf8");
    const clientEnvironment = await readFile(resolve("src/env/client.ts"), "utf8");
    const publicEnvironment = await readFile(resolve("src/env/public.ts"), "utf8");
    const browserDependencySurface = `${browserModule}\n${clientEnvironment}\n${publicEnvironment}`;
    expect(browserDependencySurface).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(browserDependencySurface).not.toContain("./admin");
  });

  it("marks every privileged module as server-only", async () => {
    const adminModule = await readFile(resolve("src/lib/supabase/admin.ts"), "utf8");
    expect(adminModule).toMatch(/^import "server-only";/);
  });
});
