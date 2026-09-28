import type { NextConfig } from "next";
const backendUrl = (process.env.BACKEND_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
if (process.env.VERCEL && (!process.env.BACKEND_URL || !backendUrl.startsWith("https://"))) {
  throw new Error("Set BACKEND_URL to the HTTPS backend URL before deploying the frontend.");
}
const config: NextConfig = {
  experimental: { proxyTimeout: 150_000 },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination:
          backendUrl + "/api/:path*",
      },
    ];
  },
};
export default config;
