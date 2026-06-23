import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep native/server-only DB packages out of the bundle; load them at runtime.
  serverExternalPackages: ["pg", "@aws-sdk/dsql-signer"],
};

export default nextConfig;
