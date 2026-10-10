import type { NextConfig } from "next";

const defaultApi = process.env.NODE_ENV === "development" ? "http://localhost:4000" : "https://jobrador-b.vercel.app";
const apiOrigin = (process.env.JOBRADOR_API_ORIGIN ?? defaultApi).replace(/\/+$/, "");

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "172.19.16.30", "192.168.*.*", "10.*.*.*", "172.*.*.*"],
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
