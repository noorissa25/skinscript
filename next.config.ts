import type { NextConfig } from "next";

// STATIC_EXPORT=1 builds the GitHub Pages demo: a static site under
// /skinscript with no server (see .github/workflows/pages.yml).
const staticExport = process.env.STATIC_EXPORT === "1";

const nextConfig: NextConfig = staticExport
  ? {
      output: "export",
      basePath: "/skinscript",
      trailingSlash: true,
      images: { unoptimized: true },
    }
  : {
      cacheComponents: true,
      partialPrefetching: true,
    };

export default nextConfig;
