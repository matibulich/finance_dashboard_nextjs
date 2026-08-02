import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Finance Dashboard",
    short_name: "Finance",
    description: "Dashboard personal de inversiones",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#000000",
    icons: [
      {
        src: "/icon-192.PNG",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.PNG",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}