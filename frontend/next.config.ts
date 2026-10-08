import type { NextConfig } from "next";

// Where the Django API lives. The browser never talks to it directly:
// /api/* and /media/* are proxied through Next.js, so there is no CORS setup
// and the same relative URLs work locally, in Docker and in production.
const API_URL = (process.env.API_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");

const nextConfig: NextConfig = {
  output: "standalone",
  // Django URLs end with a slash; keep it instead of redirecting it away.
  skipTrailingSlashRedirect: true,
  poweredByHeader: false,
  async rewrites() {
    return [
      { source: "/api/:path*/", destination: `${API_URL}/api/:path*/` },
      { source: "/api/:path*", destination: `${API_URL}/api/:path*` },
      { source: "/media/:path*", destination: `${API_URL}/media/:path*` },
    ];
  },
};

export default nextConfig;
