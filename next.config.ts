import type { NextConfig } from "next";

const apiOrigin = (process.env.JOBRADOR_API_ORIGIN ?? "https://jobrador-b.vercel.app").replace(/\/+$/, "");

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  async redirects() {
    return [{ source: "/referrals", destination: "/map?referrals=1", permanent: false }];
  },
  async rewrites() {
    return [
      { source: "/v1", destination: `${apiOrigin}/v1` },
      { source: "/v1/:path*", destination: `${apiOrigin}/v1/:path*` },
    ];
  },
};

export default nextConfig;
