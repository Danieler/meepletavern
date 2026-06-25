import { getCatalogGames, type CatalogGame } from "./catalog";

export type GuiaSEO = {
  slug: string;
  title: string;
  description: string;
  content: string;
  // We can filter the catalog using these criteria to find the games dynamically
  gameFilter: (game: CatalogGame) => boolean;
};

// MVP in-memory database for SEO guides
export const seoGuides: GuiaSEO[] = [
  {
    slug: "mejores-juegos-de-mesa-2-jugadores",
    title: "Mejores juegos de mesa para 2 jugadores",
    description: "Descubre los mejores juegos de mesa diseñados exclusivamente o que escalan perfectamente para jugar en pareja.",
    content: "Jugar en pareja es una de las mejores formas de disfrutar de los juegos de mesa. Ya sea para un duelo rápido, una campaña cooperativa intensa o para compartir una tarde tranquila, estos juegos brillan con dos jugadores.",
    gameFilter: (game) => Boolean(game.playersLabel?.includes("2 ") || game.playersLabel === "2")
  },
  {
    slug: "juegos-mesa-familiares-adultos",
    title: "Juegos de mesa familiares para jugar con adultos",
    description: "Juegos fáciles de explicar pero con suficiente miga para mantener entretenidos a los adultos en cualquier reunión.",
    content: "No todos los juegos familiares tienen que ser infantiles. Esta selección incluye títulos con reglas sencillas que cualquier adulto puede aprender en 5 minutos, pero con la suficiente estrategia o diversión para triunfar en cualquier cena o sobremesa.",
    gameFilter: (game) => game.categories.includes("Familiar") && (game.complexity ? parseInt(game.complexity) < 3 : true)
  },
  {
    slug: "juegos-cooperativos-principiantes",
    title: "Juegos de mesa cooperativos para principiantes",
    description: "Unid fuerzas contra el tablero. Los mejores juegos cooperativos para quienes empiezan en la afición.",
    content: "En los juegos cooperativos ganáis todos o perdéis todos. Son ideales para evitar piques y perfectos para enseñar a nuevos jugadores, ya que los veteranos pueden guiar las decisiones durante la partida.",
    gameFilter: (game) => game.categories.includes("Cooperativo") && (game.complexity ? parseInt(game.complexity) < 3 : true)
  },
  {
    slug: "juegos-parecidos-catan",
    title: "Juegos parecidos a Catan",
    description: "¿Te encanta Catan pero quieres probar algo nuevo? Descubre alternativas que comparten su espíritu de comercio y construcción.",
    content: "Catan es un clásico moderno, pero después de cientos de partidas puede que busques algo distinto que mantenga esa magia de negociar, gestionar recursos y construir en un tablero modular. Aquí tienes los mejores sucesores.",
    gameFilter: (game) => game.mechanics.includes("Gestión de recursos") || game.mechanics.includes("Negociación") || game.slug.includes("catan")
  },
  {
    slug: "juegos-parecidos-aventureros-al-tren",
    title: "Juegos parecidos a Aventureros al Tren",
    description: "Alternativas a Aventureros al Tren: juegos de rutas, set collection y reglas amigables.",
    content: "Aventureros al Tren (Ticket to Ride) es el rey de los juegos de crear rutas conectando ciudades. Si buscas mecánicas similares de coleccionar cartas para reclamar objetivos, estos juegos te encantarán.",
    gameFilter: (game) => game.mechanics.includes("Construcción de rutas") || game.mechanics.includes("Set collection") || game.slug.includes("aventureros-al-tren")
  }
];

export async function getGuiaBySlug(slug: string): Promise<GuiaSEO | undefined> {
  return seoGuides.find((g) => g.slug === slug);
}

export async function getGuias(): Promise<GuiaSEO[]> {
  return seoGuides;
}

export async function getGamesForGuia(guia: GuiaSEO): Promise<CatalogGame[]> {
  const allGames = await getCatalogGames();
  return allGames.filter(guia.gameFilter).slice(0, 15); // limit to top 15 matches
}
