import type { NextConfig } from "next";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  experimental: {
    externalDir: true,
  },
  images: {
    unoptimized: true,
  },
  outputFileTracingRoot: repoRoot,
  poweredByHeader: false,
};

export default nextConfig;
