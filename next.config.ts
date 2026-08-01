import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.NEXT_OUTPUT_MODE === "standalone" ? "standalone" : undefined,
  allowedDevOrigins: ["127.0.0.1"],
  // Mantém metadados dinâmicos no <head> inicial para crawlers e auditorias.
  htmlLimitedBots: /.*/,
  images: {
    unoptimized: false,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "9199",
      },
    ],
  },
  outputFileTracingIncludes: {
    "/*": ["./public/**/*"],
  },
};

export default nextConfig;
