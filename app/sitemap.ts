import type { MetadataRoute } from "next";
import {
  getRankings,
  getReviews,
  getSitemapGames,
  getCategoryTerms,
  getMechanicTerms
} from "@/lib/catalog";
import { getGuias } from "@/lib/guias";
import { getPublicUsersPage } from "@/lib/publicProfiles";
import { siteConfig } from "@/lib/site";
import { slugify } from "@/lib/slug";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const [
    catalogGames,
    rankings,
    reviews,
    guias,
    categories,
    mechanics,
    usersPage
  ] = await Promise.all([
    getSitemapGames(),
    getRankings(),
    getReviews(),
    getGuias(),
    getCategoryTerms(),
    getMechanicTerms(),
    getPublicUsersPage()
  ]);

  const staticRoutes = [
    "",
    "/juegos",
    "/rankings",
    "/resenas",
    "/guias",
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
      lastModified: game.publishedAt || game.updatedAt || game.createdAt,
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
    ...guias.map((guia) => ({
      url: `${siteConfig.url}/guias/${guia.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.75
    })),
    ...categories.map((cat) => ({
      url: `${siteConfig.url}/categorias/${slugify(cat)}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.80
    })),
    ...mechanics.map((mec) => ({
      url: `${siteConfig.url}/mecanicas/${slugify(mec)}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.80
    })),
    ...usersPage.items.map((user) => ({
      url: `${siteConfig.url}/u/${user.username}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.50
    }))
  ];
}
