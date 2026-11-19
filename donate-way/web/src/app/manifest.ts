import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sanad - سند",
    short_name: "سند",
    description: "Verified, transparent giving with Pi",
    start_url: "/",
    display: "standalone",
    background_color: "#0d1b1e",
    theme_color: "#0d1b1e",
    lang: "ar",
    dir: "rtl",
    icons: [{ src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" }],
  };
}
