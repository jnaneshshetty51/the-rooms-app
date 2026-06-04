import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  // Required for Next.js 15+ when using Prisma in API routes
  serverExternalPackages: ["@prisma/client", "@prisma/extension-*", "minio"],
  experimental: {
    serverActions: { allowedOrigins: ["admin.therooms.in"] },
  },
};

export default nextConfig;
