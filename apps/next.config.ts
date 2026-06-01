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
};

export default nextConfig;
