import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@the-rooms/ui", "@the-rooms/db", "@the-rooms/auth"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.therooms.in" },
      { protocol: "https", hostname: "placehold.co" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  // L2: Security headers for all responses
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
