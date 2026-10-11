import type { NextConfig } from "next";

// Set NEXT_PUBLIC_BASE_PATH (e.g. "/cim") when hosting under a sub-path such as GitHub Pages.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  ...(basePath ? { basePath } : {}),
  reactStrictMode: true,
};

export default nextConfig;
