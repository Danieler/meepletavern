import type { NextConfig } from "next";

const CANONICAL_HOST = "www.meepletavern.com";
const VERCEL_PRODUCTION_HOST = "meepletavern.vercel.app";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: VERCEL_PRODUCTION_HOST.replaceAll(".", "\\.")
          }
        ],
        destination: `https://${CANONICAL_HOST}/:path*`,
        permanent: true
      }
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY"
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff"
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin"
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()"
          }
        ]
      }
    ];
  }
};

export default nextConfig;
