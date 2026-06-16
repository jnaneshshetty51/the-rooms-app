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
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https://**.therooms.in https://placehold.co https://images.unsplash.com",
              "font-src 'self'",
              "connect-src 'self' https://api.razorpay.com https://api.stripe.com",
              "frame-src 'none'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; ')
          },
        ],
      },
    ];
  },
};

export default nextConfig;
