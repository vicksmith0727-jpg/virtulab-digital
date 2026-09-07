import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: ["21.0.5.68", "21.0.5.68:81", "21.0.5.68:3000", "localhost", "127.0.0.1"],
  // Production optimizations
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },
  // Enable SWC minification (default in Next 16, but explicit)
  swcMinify: true,
  // Compress responses
  compress: true,
  // Optimize images — lazy load by default
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  // Experimental: optimize package imports
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion", "@radix-ui/react-dialog"],
  },
};

export default nextConfig;
