"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getPublicEnvironment } from "@/env/client";
import type { Database } from "./database.types";

let browserClient: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function createBrowserSupabaseClient() {
  if (browserClient) return browserClient;

  const environment = getPublicEnvironment();
  browserClient = createBrowserClient<Database>(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  return browserClient;
}
