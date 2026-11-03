import type { MetadataRoute } from "next";

// Installs Dad's screen on the Galaxy S22 home screen (pin it large in Samsung Easy Mode).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dad Care",
    short_name: "Dad Care",
    description: "Large buttons to check in, take medicine, talk to family and call for help.",
    start_url: "/dad",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f2f2ee",
    theme_color: "#f2f2ee",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
