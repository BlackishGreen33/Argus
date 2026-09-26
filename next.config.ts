import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  outputFileTracingIncludes: {
    "/api/**/*": ["./data/source/comp.sql", "./data/source/vul.sql"],
  },
};

export default nextConfig;
