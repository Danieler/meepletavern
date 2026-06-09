import type { Prisma } from "@prisma/client";
import { normalizeCandidateMetadata, normalizeGamePlayers } from "@/lib/editorialMappers";

export const editorialDraftPrompt = `Eres editor de MeepleTavern.
Redacta contenido original en español usando solo los datos confirmados.
No inventes premios.
No inventes disponibilidad.
No inventes precio.
No inventes componentes.
No copies frases largas de la fuente.
Si falta informacion, redacta con prudencia.`;

type EditorialDraftInput = {
  title: string;
  originalTitle?: string | null;
  metadata: Prisma.JsonValue;
  extractedDescription?: string | null;
};

export function generateEditorialDraft(input: EditorialDraftInput): Prisma.JsonObject {
  const metadata = normalizeCandidateMetadata(input.metadata);
  const players = normalizeGamePlayers(metadata.players);
  const year = typeof metadata.year === "number" ? metadata.year : null;
  const publisher = typeof metadata.publisher === "string" ? metadata.publisher : null;
  const playtime = formatPlaytime(metadata.minPlayTime, metadata.maxPlayTime);
  const playerText = players.min && players.max ? `${players.min}-${players.max} jugadores` : "jugadores por confirmar";
  const ageText = typeof metadata.minAge === "number" ? `${metadata.minAge}+` : "edad por confirmar";
  const facts = [year ? `publicado en ${year}` : "", publisher ? `editorial ${publisher}` : "", playerText, playtime, ageText]
    .filter(Boolean)
    .join(", ");
  const cautiousContext = input.extractedDescription
    ? "La fuente ofrece una descripcion oficial que debe revisarse antes de usar citas o detalles concretos."
    : "La informacion disponible es limitada y conviene completar la ficha manualmente.";

  return {
    shortDescription: `${input.title} es un juego de mesa con datos basicos confirmados: ${facts}.`,
    description: `${input.title} queda preparado como ficha editorial inicial para MeepleTavern. ${cautiousContext} Esta version evita afirmar premios, disponibilidad, precio o componentes no verificados.`,
    quickVerdict: `Pendiente de revision de mesa: ${input.title} parece encajar como propuesta a evaluar con informacion confirmada antes de publicar.`,
    bestFor: "Jugadores que quieran revisar una ficha inicial con datos confirmados antes de decidir si encaja en su mesa.",
    notFor: "Quien necesite una recomendacion cerrada, datos completos o una opinion publicada sin revision editorial.",
    pros: ["Base editorial creada con datos confirmados", "Pendiente de revision humana antes de publicar"],
    cons: ["Informacion incompleta", "Sin valoracion de mesa confirmada"],
    faq: [
      {
        question: `Que se sabe de ${input.title}?`,
        answer: `Por ahora la ficha recoge datos confirmados como ${facts}.`
      },
      {
        question: `La ficha de ${input.title} esta lista para publicar?`,
        answer: "No. Este borrador necesita revision editorial antes de publicarse."
      }
    ],
    seoTitle: `${input.title}: ficha editorial en revision`,
    seoDescription: `${input.title} en MeepleTavern: datos basicos confirmados y borrador editorial pendiente de revision.`
  };
}

function formatPlaytime(minInput: unknown, maxInput: unknown) {
  const min = typeof minInput === "number" ? minInput : null;
  const max = typeof maxInput === "number" ? maxInput : null;

  if (min && max && min !== max) {
    return `${min}-${max} min`;
  }

  if (min || max) {
    return `${min || max} min`;
  }

  return "duracion por confirmar";
}
