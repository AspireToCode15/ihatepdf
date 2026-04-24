import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },
  // Naye Turbopack engine ko shant karne ke liye:
  turbopack: {},
};

export default nextConfig;