type PublicGameCopyInput = {
  title: string;
  shortDescription?: string | null;
  shortSummary?: string | null;
  description?: string | null;
  quickVerdict?: string | null;
  review?: string | null;
  playersLabel?: string | null;
  playtime?: string | null;
  complexity?: string | null;
};

const PLACEHOLDER_TEXT_PATTERN =
  /(ficha preliminar|pendiente de revisi[oó]n editorial|importada para revisi[oó]n editorial|ficha de trabajo|borrador editorial|fuente comercial aprobada|revisi[oó]n editorial|pendiente de valoraci[oó]n editorial|importada desde|rev[ií]sala antes de publicarla)/i;

export function needsPublicEditorialRewrite(input: PublicGameCopyInput) {
  return [
    input.shortDescription,
    input.shortSummary,
    input.description,
    input.quickVerdict,
    input.review
  ].some((value) => isPlaceholderText(value));
}

export function buildPublicEditorialCopy(input: PublicGameCopyInput) {
  const title = input.title.trim();
  const summary = buildNeutralSummary(input);
  const description = buildNeutralDescription(input);
  const verdict = buildNeutralVerdict(input);

  return {
    shortDescription: summary,
    shortSummary: summary,
    description,
    quickVerdict: verdict,
    review: verdict,
    seoTitle: `${title} | MeepleTavern`,
    seoDescription: buildSeoDescription(input)
  };
}

export function getPublicReviewSummary(input: PublicGameCopyInput) {
  const candidate = firstSafeText([input.shortDescription, input.shortSummary, input.quickVerdict, input.review, input.description]);
  return candidate || buildNeutralSummary(input);
}

export function getPublicGameDescription(input: PublicGameCopyInput) {
  const candidate = firstSafeText([input.description, input.shortDescription, input.shortSummary, input.review, input.quickVerdict]);
  return candidate || buildNeutralDescription(input);
}

function isPlaceholderText(value: string | null | undefined) {
  return typeof value === "string" && PLACEHOLDER_TEXT_PATTERN.test(value);
}

function firstSafeText(values: Array<string | null | undefined>) {
  for (const value of values) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed && !PLACEHOLDER_TEXT_PATTERN.test(trimmed)) {
        return trimmed;
      }
    }
  }

  return null;
}

function buildNeutralSummary(input: PublicGameCopyInput) {
  const facts = [input.playersLabel, input.playtime, input.complexity].filter(Boolean).join(" · ");
  if (facts) {
    return `${input.title} · ${facts}`;
  }

  return `${input.title} en MeepleTavern`;
}

function buildNeutralDescription(input: PublicGameCopyInput) {
  const parts = [`${input.title} en MeepleTavern.`];
  const facts = [
    input.playersLabel ? `jugadores ${input.playersLabel}` : null,
    input.playtime ? `duración ${input.playtime}` : null,
    input.complexity ? `dificultad ${input.complexity}` : null
  ].filter(Boolean);

  if (facts.length) {
    parts.push(`Datos básicos: ${facts.join(", ")}.`);
  }

  return parts.join(" ");
}

function buildNeutralVerdict(input: PublicGameCopyInput) {
  const facts = [input.playersLabel, input.playtime, input.complexity].filter(Boolean).join(", ");
  if (facts) {
    return `${input.title} llega con datos básicos sobre ${facts}.`;
  }

  return `${input.title} está disponible en MeepleTavern.`;
}

function buildSeoDescription(input: PublicGameCopyInput) {
  const facts = [input.playersLabel, input.playtime, input.complexity].filter(Boolean).join(", ");
  if (facts) {
    return `${input.title} en MeepleTavern con datos básicos de ${facts}.`;
  }

  return `${input.title} en MeepleTavern.`;
}
