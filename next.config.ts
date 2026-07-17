import type { NextConfig } from "next";
import { parseServerEnvironment } from "./src/env/schema";

// Fail at dev/build startup instead of discovering missing integration settings at runtime.
parseServerEnvironment(process.env);

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
