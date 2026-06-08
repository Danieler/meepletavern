import type { MetadataRoute } from "next";
import { getPublishedGames } from "@/lib/games";
import { siteConfig } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const games = await getPublishedGames({ limit: 1000 });

  return [
    {
      url: siteConfig.url,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1
    },
    ...games.map((game) => ({
      url: `${siteConfig.url}/juegos/${game.slug}`,
      lastModified: game.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8
    }))
  ];
}

