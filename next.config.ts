import type { NextConfig } from "next";

const config: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["@node-rs/argon2", "pg"],
  experimental: { serverActions: { bodySizeLimit: "11mb" } },
};

export default config;
