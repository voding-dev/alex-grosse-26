import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["use-callback-ref", "use-sidecar", "react-remove-scroll"],
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "3210",
        pathname: "/api/storage/**",
      },
      {
        protocol: "https",
        hostname: "*.convex.cloud",
        pathname: "/api/storage/**",
      },
      {
        protocol: "https",
        hostname: "*.convex.site",
        pathname: "/api/storage/**",
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // Exclude convex directory from Next.js bundling - it runs separately
    // Enhanced watch options to prevent constant rebuilds
    config.watchOptions = {
      ...config.watchOptions,
      ignored: [
        "**/node_modules/**",
        "**/.convex/**",
        "**/convex/**",
        "**/.next/**",
        "**/out/**",
        "**/*.tsbuildinfo",
        "**/next-env.d.ts",
        // Windows-specific: ignore case-insensitive patterns
        "**/.next",
        "**/node_modules",
        "**/.convex",
      ],
      // Aggregate multiple changes into a single rebuild (wait 300ms after last change)
      aggregateTimeout: 300,
      // Only rebuild on file changes, not on directory changes
      followSymlinks: false,
    };

    // Ensure proper module resolution for peer dependencies
    config.resolve = config.resolve || {};
    config.resolve.modules = [
      ...(config.resolve.modules || []),
      "node_modules",
    ];

    // Mark convex directory as external to prevent bundling
    config.module = config.module || {};
    config.module.rules = config.module.rules || [];
    
    return config;
  },
};

export default nextConfig;
