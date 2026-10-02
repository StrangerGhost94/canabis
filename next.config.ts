import type { NextConfig } from "next";

const config: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["@node-rs/argon2", "pg"],
  experimental: { serverActions: { bodySizeLimit: "21mb" } },
};

export default config;
