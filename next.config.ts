import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 はネイティブバイナリを持つため、Next.js のバンドル対象から除外する
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
