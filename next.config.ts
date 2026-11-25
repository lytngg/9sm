import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Room for a 4 MB upload plus form overhead. Vercel refuses request bodies over 4.5 MB.
  experimental: { serverActions: { bodySizeLimit: "4.4mb" } },
};

export default nextConfig;
