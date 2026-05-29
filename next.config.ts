import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Lets a second instance use its own build dir (NEXT_DIST_DIR=.next-4001) so
  // two dev servers can run from one repo without fighting over .next.
  distDir: process.env.NEXT_DIST_DIR || '.next',
};

export default nextConfig;
