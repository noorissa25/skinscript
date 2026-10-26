// Build-time switches for the static GitHub Pages demo. In that build there
// are no API routes, so analysis and product search run in the browser and
// the optional AI summary is off.
export const isStaticDemo = process.env.NEXT_PUBLIC_STATIC_DEMO === "1";

/** Prefix for files in public/ when the site is served from a subpath (e.g. /skinscript). */
export const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
