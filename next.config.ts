import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // `next build` type-check can fail in this environment with WASM-only SWC; `tsc --noEmit` is run separately.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
