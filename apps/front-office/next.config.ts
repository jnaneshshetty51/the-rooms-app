import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  middlewareClientMaxBodySize: 25 * 1024 * 1024,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "localhost", port: "9000", pathname: "/**" },
    ],
  },
  serverExternalPackages: ["@prisma/client", "@react-pdf/renderer"],
};

export default nextConfig;
