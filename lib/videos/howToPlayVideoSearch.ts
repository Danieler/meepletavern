import "server-only";

import { tavily } from "@tavily/core";
import type { Game } from "@prisma/client";
import { z } from "zod";
import {
  buildHowToPlayVideoQueries,
  selectHowToPlayVideos,
  sourceFromUrl
} from "@/lib/videos/howToPlayVideos";
import { isYouTubeUrl } from "@/lib/videos/youtube";

const tavilyVideoResultSchema = z.object({
  title: z.string().nullish().transform((value) => value || ""),
  url: z.string().url(),
  content: z.string().nullish().transform((value) => value || null),
  rawContent: z.string().nullish().transform((value) => value || null)
});

export async function searchHowToPlayVideosWithTavily(game: Game) {
  const apiKey = process.env.TAVILY_API_KEY?.trim();
  if (!apiKey) {
    const directVideos = await searchHowToPlayVideosDirectly(game);
    return {
      videos: directVideos,
      warning: directVideos.length ? null : "Tavily no configurado para búsqueda de vídeos"
    };
  }

  const client = tavily({ apiKey });
  const queries = buildHowToPlayVideoQueries(game);
  let responses: Awaited<ReturnType<typeof client.search>>[] = [];

  try {
    responses = await Promise.all(
      queries.map((query) =>
        client.search(query, {
          searchDepth: "basic",
          topic: "general",
          maxResults: 5,
          includeAnswer: false,
          includeRawContent: "text",
          includeImages: false
        })
      )
    );
  } catch {
    const directVideos = await searchHowToPlayVideosDirectly(game);
    return {
      videos: directVideos,
      warning: directVideos.length ? null : "No se pudieron buscar vídeos con Tavily"
    };
  }

  const candidates = responses
    .flatMap((response) => z.array(tavilyVideoResultSchema).parse(response.results || []))
    .map((result) => ({
      url: result.url,
      title: result.title,
      snippet: [result.content, result.rawContent].filter(Boolean).join("\n\n"),
      source: sourceFromUrl(result.url)
    }))
    .filter((candidate) => isYouTubeUrl(candidate.url));

  const videos = selectHowToPlayVideos(candidates, game);
  if (videos.length) {
    return { videos, warning: null };
  }

  const directVideos = await searchHowToPlayVideosDirectly(game);
  return {
    videos: directVideos,
    warning: directVideos.length ? null : "No se encontraron vídeos de YouTube"
  };
}

async function searchHowToPlayVideosDirectly(game: Game) {
  const queries = buildHowToPlayVideoQueries(game);
  const candidates: Array<{ url: string; title: string; snippet: string; source: string }> = [];
  const seen = new Set<string>();

  for (const query of queries) {
    const results = await searchYouTubeResultsPage(query).catch(() => []);
    for (const result of results) {
      if (seen.has(result.url)) {
        continue;
      }

      seen.add(result.url);
      candidates.push({
        ...result,
        snippet: "",
        source: result.source || "YouTube"
      });
    }
  }

  return selectHowToPlayVideos(candidates, game);
}

async function searchYouTubeResultsPage(query: string) {
  const response = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "es-ES,es;q=0.9,en;q=0.8"
    }
  });

  if (!response.ok) {
    return [];
  }

  const html = await response.text();
  const results: Array<{ url: string; title: string; source: string }> = [];
  const seen = new Set<string>();
  const matches = html.matchAll(/"videoId":"([^"]+)"[\s\S]{0,1800}?"title":\{"runs":\[\{"text":"([^"]+)"/g);

  for (const match of matches) {
    const id = decodeJsonString(match[1] || "");
    const title = decodeJsonString(match[2] || "");
    if (!id || !title || seen.has(id)) {
      continue;
    }

    seen.add(id);
    results.push({
      url: `https://www.youtube.com/watch?v=${id}`,
      title,
      source: "YouTube"
    });

    if (results.length >= 8) {
      break;
    }
  }

  return results;
}

function decodeJsonString(value: string) {
  try {
    return JSON.parse(`"${value.replace(/"/g, '\\"')}"`) as string;
  } catch {
    return value;
  }
}
