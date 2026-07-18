import type { NextConfig } from "next";
import { parseServerEnvironment } from "./src/env/schema";
import { securityHeaders } from "./src/lib/security/headers";

// Fail at dev/build startup instead of discovering missing integration settings at runtime.
const environment = parseServerEnvironment(process.env);
const supabaseHostname = new URL(environment.NEXT_PUBLIC_SUPABASE_URL).hostname;

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    remotePatterns: [{ protocol: "https", hostname: supabaseHostname, pathname: "/storage/v1/object/**" }],
  },
  async headers() {
    return [{ source: "/(.*)", headers: [...securityHeaders] }];
  },
};

export default nextConfig;
