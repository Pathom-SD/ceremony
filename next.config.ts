import type { NextConfig } from "next";
import { NEXT_PROXY_MAX_BODY_SIZE } from "./src/lib/upload-limits.constants";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["192.168.99.*"],
  experimental: {
    serverActions: {
      bodySizeLimit: NEXT_PROXY_MAX_BODY_SIZE,
    },
    proxyClientMaxBodySize: NEXT_PROXY_MAX_BODY_SIZE,
  },
};

export default nextConfig;
