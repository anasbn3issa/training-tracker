import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Training Tracker",
    short_name: "Training",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // The barbell sits inside the central safe zone, so the same image works when masked.
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
