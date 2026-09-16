import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: [
    "pdf-parse",
    "pdfjs-dist",
    "pdf-lib",
    "@aws-sdk/client-s3",
    "@aws-sdk/lib-storage",
    "@aws-sdk/s3-request-presigner",
  ],
  // Assignment PDF uploads allow up to 50MB; raise Next body buffers so multipart
  // is not truncated (default middleware/proxy buffering is ~10MB / can drop bytes).
  experimental: {
    middlewareClientMaxBodySize: "55mb",
    // Present in Next 15.5+ runtime; typings may lag behind.
    proxyClientMaxBodySize: "55mb",
    serverActions: {
      bodySizeLimit: "55mb",
    },
  } as NextConfig["experimental"],
  images: {
    // Allow any HTTPS remote image host (HTTP is rejected by validateImageUrl on save).
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config, { dev }) => {
    // pdfjs-dist breaks with eval-* devtool in Next.js dev (webpack#20095).
    if (dev && config.devtool && String(config.devtool).startsWith("eval")) {
      config.devtool = "cheap-module-source-map";
    }
    return config;
  },
};

export default nextConfig;
