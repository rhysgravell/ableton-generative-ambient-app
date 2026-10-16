import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // /api/run executes these at runtime, so ship them with the route.
  outputFileTracingIncludes: {
    "/api/run": ["./python/**/*.py"],
  },
};

export default nextConfig;
