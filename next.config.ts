import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_ID: String(Date.now()),
  },
};

export default nextConfig;
