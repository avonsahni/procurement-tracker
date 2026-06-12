import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ProcureTrack — Procurement & Project Tracking",
    short_name: "ProcureTrack",
    description:
      "Procurement and execution tracking for engineering and infrastructure project teams. RFQ to handover, vendors, milestones, budgets, and team messaging — on one live dashboard.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#f8fafc",
    theme_color: "#0B1B2B",
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
    shortcuts: [
      {
        name: "Team Hub",
        short_name: "Team Hub",
        description: "Open team messaging",
        url: "/communication",
      },
      {
        name: "Dashboard",
        short_name: "Dashboard",
        description: "Open the portfolio dashboard",
        url: "/",
      },
    ],
  };
}
