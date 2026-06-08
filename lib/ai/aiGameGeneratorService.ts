import { slugify } from "@/lib/slug";
import type { FaqItem, SourceItem } from "@/lib/content";

export type GeneratedGameDraft = {
  name: string;
  slug: string;
  imageUrl: string | null;
  coverImageUrl: string | null;
  coverImageAlt: string;
  imageSourceName: string | null;
  imageSourceUrl: string | null;
  imageLicenseNote: string | null;
  imageStatus: "verified" | "missing" | "placeholder" | "needs_review";
  description: string | null;
  review: string | null;
  shortSummary: string | null;
  pros: string[];
  cons: string[];
  bestFor: string | null;
  notFor: string | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  playtime: string | null;
  age: string | null;
  complexity: string | null;
  categories: string[];
  mechanics: string[];
  themes: string[];
  similarGames: string[];
  faqs: FaqItem[];
  seoTitle: string | null;
  seoDescription: string | null;
  buyUrl: string | null;
  sources: SourceItem[];
};

export async function generateGameDraft(input: { name: string }): Promise<GeneratedGameDraft> {
  const name = input.name.trim();

  if (!name) {
    throw new Error("Escribe el nombre de un juego para generar la ficha.");
  }

  if (hasConfiguredAiProvider()) {
    // Future adapter boundary: call OpenAI, Bedrock or another provider here.
    // The public contract stays the same and generated content must remain draft.
  }

  return generateMockDraft(name);
}

function hasConfiguredAiProvider() {
  return Boolean(process.env.OPENAI_API_KEY || process.env.AI_PROVIDER);
}

function generateMockDraft(name: string): GeneratedGameDraft {
  const slug = slugify(name);
  const title = name.replace(/\s+/g, " ");

  return {
    name: title,
    slug,
    imageUrl: null,
    coverImageUrl: null,
    coverImageAlt: `Portada de ${title}`,
    imageSourceName: null,
    imageSourceUrl: null,
    imageLicenseNote: null,
    imageStatus: "missing",
    shortSummary: `${title} es una propuesta para mesa curiosa: tácticas claras, decisiones frecuentes y una entrada amable para grupos que quieren descubrir algo con sabor propio.`,
    description:
      `${title} se presenta aquí como una ficha inicial generada para edición. El borrador prioriza una lectura útil en español: qué ofrece, para quién puede encajar y qué datos conviene revisar antes de publicar. ` +
      "Los datos concretos deben validarse con fuentes oficiales o editoriales antes de convertir esta ficha en una página pública definitiva.",
    review:
      `Como punto de partida editorial, ${title} parece encajar en una sesión donde importan el ritmo, la interacción y la claridad de objetivos. ` +
      "La reseña definitiva debería completarse tras una partida o consulta de fuentes verificadas para evitar conclusiones demasiado rotundas.",
    pros: [
      "Borrador estructurado y fácil de revisar",
      "Resumen pensado para búsquedas en español",
      "Apartados SEO listos para completar con datos verificados"
    ],
    cons: [
      "Datos generados como aproximación inicial",
      "Necesita revisión antes de publicar",
      "No incluye precio ni disponibilidad sin fuente clara"
    ],
    bestFor:
      "Jugadores que buscan una orientación rápida antes de decidir si investigar el juego con más detalle.",
    notFor:
      "Personas que necesitan una ficha con datos editoriales cerrados, precio actualizado o disponibilidad confirmada.",
    minPlayers: null,
    maxPlayers: null,
    playtime: "Por confirmar",
    age: "Por confirmar",
    complexity: "Por confirmar",
    categories: ["Borrador IA", "Por clasificar"],
    mechanics: ["Por confirmar"],
    themes: ["Por confirmar"],
    similarGames: ["Catan", "Carcassonne", "Aventureros al Tren"],
    faqs: [
      {
        question: `¿${title} merece la pena?`,
        answer:
          "Este borrador no debe publicarse como veredicto final. Sirve como base para añadir opinión, experiencia de juego y fuentes."
      },
      {
        question: `¿Cuántos jugadores admite ${title}?`,
        answer:
          "El dato debe verificarse antes de publicar. Si no hay fuente clara, es mejor dejarlo vacío o marcado como aproximado."
      },
      {
        question: `¿Qué juegos se parecen a ${title}?`,
        answer:
          "La lista de juegos parecidos es editable y debe ajustarse según mecánicas, duración y público objetivo."
      }
    ],
    seoTitle: `${title}: reseña, opinión, duración y jugadores`,
    seoDescription:
      `Ficha de ${title} en español con resumen, opinión, jugadores, duración, pros, contras y juegos parecidos. Borrador editable antes de publicar.`,
    buyUrl: null,
    sources: [
      {
        label: "Borrador generado sin fuentes externas verificadas",
        url: ""
      }
    ]
  };
}
