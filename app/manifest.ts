import type { MetadataRoute } from "next";

export const dynamic = "force-static";

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Chord Flags",
    short_name: "Chord Flags",
    description: "A calm, private trainer for the Eguchi Chord Identification Method.",
    start_url: `${base}/`,
    scope: `${base}/`,
    display: "standalone",
    orientation: "any",
    background_color: "#f6f3ec",
    theme_color: "#f6f3ec",
    icons: [
      { src: `${base}/icons/icon-192.png`, sizes: "192x192", type: "image/png" },
      { src: `${base}/icons/icon-512.png`, sizes: "512x512", type: "image/png" },
      { src: `${base}/icons/maskable-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
