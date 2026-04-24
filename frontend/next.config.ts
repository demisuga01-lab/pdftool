import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "https://tools.wellfriend.online/api/:path*",
      },
    ];
  },
};

export default nextConfig;
