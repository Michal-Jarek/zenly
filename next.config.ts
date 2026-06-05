import type { NextConfig } from "next";

// Lint runs as a separate gate (`npm run lint`); keep the build robust and independent of it.
const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
