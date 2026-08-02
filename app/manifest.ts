import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Finance Dashboard",
    short_name: "Finance",
    description: "Dashboard personal para el seguimiento de inversiones",

    start_url: "/",
    scope: "/",

    display: "standalone",
    orientation: "portrait",

    background_color: "#0f172a",
    theme_color: "#0f172a",

    lang: "es-AR",

    icons: [
      {
        src: "/icon-192.PNG",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.PNG",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}