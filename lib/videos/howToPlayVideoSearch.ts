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
    return {
      videos: [],
      warning: "Tavily no configurado para búsqueda de vídeos"
    };
  }

  const client = tavily({ apiKey });
  const queries = buildHowToPlayVideoQueries(game);
  const responses = await Promise.all(
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

  const candidates = responses
    .flatMap((response) => z.array(tavilyVideoResultSchema).parse(response.results || []))
    .map((result) => ({
      url: result.url,
      title: result.title,
      snippet: [result.content, result.rawContent].filter(Boolean).join("\n\n"),
      source: sourceFromUrl(result.url)
    }))
    .filter((candidate) => isYouTubeUrl(candidate.url));

  return { videos: selectHowToPlayVideos(candidates, game), warning: null };
}
