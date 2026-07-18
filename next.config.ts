import type { NextConfig } from "next";
import { parseServerEnvironment } from "./src/env/schema";
import { securityHeaders } from "./src/lib/security/headers";

// Fail at dev/build startup instead of discovering missing integration settings at runtime.
parseServerEnvironment(process.env);

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [{ source: "/(.*)", headers: [...securityHeaders] }];
  },
};

export default nextConfig;
