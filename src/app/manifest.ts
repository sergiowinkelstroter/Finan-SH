import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Finanças do casal",
    short_name: "Finanças",
    description: "Faturas, parceladas, teto de gastos e reserva — a dois.",
    start_url: "/",
    display: "standalone",
    background_color: "#F6F5FD",
    theme_color: "#6C4CF0",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
