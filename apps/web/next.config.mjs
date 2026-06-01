/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "localhost", port: "9000", pathname: "/**" },
    ],
  },
  // Required for Next.js 15+ when using Prisma in API routes
  serverExternalPackages: ["@prisma/client", "@prisma/extension-*"],
};
export default nextConfig;
