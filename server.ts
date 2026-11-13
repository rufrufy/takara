import { serve } from "bun";
import { resolve } from "path";

const PORT = Number(process.env.PORT) || 3000;
const DIST_DIR = resolve(import.meta.dir, "dist");

serve({
  port: PORT,
  hostname: "0.0.0.0",
  async fetch(req) {
    const url = new URL(req.url);
    const pathname = decodeURIComponent(url.pathname);

    // Guard against path traversal
    const safePath = resolve(DIST_DIR, "." + pathname);
    if (!safePath.startsWith(DIST_DIR)) {
      return new Response("Forbidden", { status: 403 });
    }

    // Serve static asset if found
    if (pathname !== "/") {
      const file = Bun.file(safePath);
      if (await file.exists()) {
        return new Response(file);
      }
      // Return 404 directly for missing asset files
      if (pathname.startsWith("/assets/")) {
        return new Response("Asset not found", { status: 404 });
      }
    }

    // SPA fallback: return index.html for client-side routing
    return new Response(Bun.file(resolve(DIST_DIR, "index.html")));
  },
});

console.log(`Takara web server listening on http://0.0.0.0:${PORT}`);
