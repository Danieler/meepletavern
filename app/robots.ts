import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";

export const revalidate = 86400;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin/", "/auth/", "/mi-perfil/", "/juegos?*"]
      },
      {
        userAgent: ["GPTBot", "ChatGPT-User", "CCBot", "anthropic-ai", "ClaudeBot", "PerplexityBot", "Bytespider"],
        disallow: ["/"]
      }
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`
  };
}
