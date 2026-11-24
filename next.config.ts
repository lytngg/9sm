import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Room for a 2 MB profile photo plus form overhead.
  experimental: { serverActions: { bodySizeLimit: "3mb" } },
};

export default nextConfig;
