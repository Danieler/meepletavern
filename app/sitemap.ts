import type { MetadataRoute } from "next";
import {
  getCatalogGames,
  getRankings,
  getReviews,
} from "@/lib/catalog";
import { siteConfig } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const [catalogGames, rankings, reviews] = await Promise.all([
    getCatalogGames(),
    getRankings(),
    getReviews()
  ]);
  const staticRoutes = [
    "",
    "/juegos",
    "/rankings",
    "/resenas",
    "/taberna",
    "/categorias",
    "/mecanicas"
  ];
  const legalRoutes = ["/aviso-legal", "/privacidad", "/cookies"];

  return [
    ...staticRoutes.map((route) => ({
      url: `${siteConfig.url}${route}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: route === "" ? 1 : 0.85
    })),
    ...legalRoutes.map((route) => ({
      url: `${siteConfig.url}${route}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.35
    })),
    ...catalogGames.map((game) => ({
      url: `${siteConfig.url}/juegos/${game.slug}`,
      lastModified: new Date(game.addedAt),
      changeFrequency: "weekly" as const,
      priority: 0.82
    })),
    ...rankings.map((ranking) => ({
      url: `${siteConfig.url}/rankings/${ranking.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.78
    })),
    ...reviews.map((review) => ({
      url: `${siteConfig.url}/resenas/${review.slug}`,
      lastModified: new Date(review.publishedAt),
      changeFrequency: "monthly" as const,
      priority: 0.72
    }))
  ];
}
