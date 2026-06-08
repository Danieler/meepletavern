import type { MetadataRoute } from "next";
import { catalogGames, categoryTerms, mechanicTerms, rankings, reviews, themeTerms } from "@/lib/catalog";
import { siteConfig } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticRoutes = [
    "",
    "/juegos",
    "/rankings",
    "/resenas",
    "/categorias",
    "/mecanicas",
    "/tematicas"
  ];

  return [
    ...staticRoutes.map((route) => ({
      url: `${siteConfig.url}${route}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: route === "" ? 1 : 0.85
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
    })),
    ...categoryTerms.map((term) => ({
      url: `${siteConfig.url}/juegos?category=${encodeURIComponent(term)}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.62
    })),
    ...mechanicTerms.map((term) => ({
      url: `${siteConfig.url}/juegos?mechanic=${encodeURIComponent(term)}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.62
    })),
    ...themeTerms.map((term) => ({
      url: `${siteConfig.url}/juegos?theme=${encodeURIComponent(term)}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.62
    }))
  ];
}
