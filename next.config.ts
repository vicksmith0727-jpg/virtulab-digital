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
    // Remove console.log in production (keeps error/warn)
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },
  // Compress responses
  compress: true,
  // Optimize images — lazy load by default (AVIF + WebP)
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  // Experimental: optimize package imports (tree-shaking)
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion", "@radix-ui/react-dialog"],
  },
  // CSP headers — allow unsafe-eval in dev (needed by some deps + the preview gateway)
  // In production, this is tightened to only allow self + unsafe-inline
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: process.env.NODE_ENV === 'production'
              ? "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' 'unsafe-eval'; img-src 'self' https: data: blob:; font-src 'self' https:; connect-src 'self' https: ws: wss:; frame-src 'self';"
              : "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' 'unsafe-eval'; img-src 'self' https: data: blob:; font-src 'self' https:; connect-src 'self' https: ws: wss: http:; frame-src 'self';",
          },
        ],
      },
    ]
  },
};

export default nextConfig;
