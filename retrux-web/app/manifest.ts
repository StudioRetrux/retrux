import type { MetadataRoute } from "next";

// Built once at build time (needed for the static export on cPanel; no change on Vercel).
export const dynamic = "force-static";

// Web app manifest (install / home-screen icons). Icons: Figma 2991:1682, the logomark on a white tile (rounded 20 %
// for "any"; square full-bleed for "maskable", the mark scaled into the 80 % safe circle so no mask clips it).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Retrux",
    short_name: "Retrux",
    description:
      "Innovative digital studio for humankind. Crafting immersive, interactive, impossibly alive digital experience.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#bccadb",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
