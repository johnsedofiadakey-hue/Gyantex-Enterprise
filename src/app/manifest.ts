import type { MetadataRoute } from "next";
import { BUSINESS_NAME, BUSINESS_TAGLINE } from "@/lib/config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BUSINESS_NAME,
    short_name: "Gyantex",
    description: BUSINESS_TAGLINE,
    start_url: "/",
    display: "standalone",
    background_color: "#FFFFFF",
    theme_color: "#FD0100",
    icons: [{ src: "/icon-512.png", sizes: "512x512", type: "image/png" }],
  };
}
