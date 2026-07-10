import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MeepleTavern",
    short_name: "MeepleTavern",
    description: "Catálogo, reseñas, rankings y recomendaciones de juegos de mesa en español",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f1e6",
    theme_color: "#3a2118",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "32x32",
        type: "image/x-icon"
      },
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png"
      }
    ]
  };
}
