import type { MetadataRoute } from "next";

// Lets the app be added to the home screen of a phone or iPad and open full
// screen like an app. (Excluded from the sign-in redirect in middleware.ts,
// because browsers fetch the manifest without the login cookie.)
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Eagle Labs — Facility Operations",
    short_name: "Eagle Ops",
    description: "Cleaning, 5S, inspections and audit-ready records for the facility.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#0b1220",
    theme_color: "#0b1220",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
