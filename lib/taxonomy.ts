import { slugify } from "@/lib/slug";

export type TaxonomyTypeKey = "category" | "mechanic" | "theme";

export type TaxonomyTermItem = {
  id: string;
  type: TaxonomyTypeKey;
  name: string;
  slug: string;
};

export const CANONICAL_CATEGORIES = [
  "Familiar",
  "Infantil",
  "Party",
  "Gateway",
  "Estrategia",
  "Eurogame",
  "Temático",
  "Cooperativo",
  "Solitario",
  "Dos jugadores",
  "Wargame",
  "Miniaturas",
  "Dungeon Crawler",
  "Campaña / Legacy",
  "Narrativo",
  "Aventura",
  "Cartas",
  "Deckbuilding",
  "Roll & Write",
  "Deducción",
  "Abstracto",
  "Clásicos modernos",
  "Fantasía",
  "Ciencia ficción",
  "Terror",
  "Histórico"
] as const;

export const CANONICAL_MECHANICS = [
  "Colocación de trabajadores",
  "Colocación de losetas",
  "Gestión de recursos",
  "Gestión de mano",
  "Deckbuilding",
  "Engine building",
  "Set collection",
  "Draft de cartas",
  "Mayorías",
  "Area control",
  "Rutas y redes",
  "Negociación",
  "Push your luck",
  "Deducción",
  "Roles ocultos",
  "Cooperativo",
  "Campaña",
  "Legacy",
  "Combate con dados",
  "Wargame"
] as const;

export type CanonicalCategory = (typeof CANONICAL_CATEGORIES)[number];
export type CanonicalMechanic = (typeof CANONICAL_MECHANICS)[number];

const canonicalCategorySet = new Set<string>(CANONICAL_CATEGORIES);
const canonicalMechanicSet = new Set<string>(CANONICAL_MECHANICS);
const categoriesByKey = buildCanonicalLookup(CANONICAL_CATEGORIES);
const mechanicsByKey = buildCanonicalLookup(CANONICAL_MECHANICS);

const categoryAliases: Record<string, CanonicalCategory[] | null> = {
  familiares: ["Familiar"],
  familia: ["Familiar"],
  "familiar-familiares": ["Familiar"],
  "familiar-familiar": ["Familiar"],
  fiesta: ["Party"],
  fiestas: ["Party"],
  "juegos-de-fiesta": ["Party"],
  "party-games": ["Party"],
  "party-game": ["Party"],
  principiantes: ["Gateway"],
  iniciacion: ["Gateway"],
  "estrategia-familiar": ["Gateway", "Familiar", "Estrategia"],
  "aventura-familiar": ["Aventura", "Familiar"],
  tematicas: ["Temático"],
  tematica: ["Temático"],
  tematicos: ["Temático"],
  "juego-tematico": ["Temático"],
  superheroes: ["Temático"],
  comics: ["Temático"],
  comic: ["Temático"],
  campana: ["Campaña / Legacy"],
  "campana-legacy": ["Campaña / Legacy"],
  legacy: ["Campaña / Legacy"],
  "colocacion-de-losetas": null,
  rutas: null,
  "rutas-y-redes": null,
  guerra: ["Wargame"],
  militar: ["Wargame"],
  "guerra-militar": ["Wargame", "Histórico"],
  "guerra-militar-historico": ["Wargame", "Histórico"],
  historico: ["Histórico"],
  historia: ["Histórico"],
  lovecraft: ["Terror"],
  cthulhu: ["Terror"],
  "lovecraft-cthulhu": ["Terror"],
  zombies: ["Terror"],
  zombis: ["Terror"],
  zombie: ["Terror"],
  horror: ["Terror"],
  "ciencia-ficcion": ["Ciencia ficción"],
  scifi: ["Ciencia ficción"],
  "sci-fi": ["Ciencia ficción"],
  fantasia: ["Fantasía"],
  aventura: ["Aventura"],
  aventuras: ["Aventura"],
  "con-miniaturas": ["Miniaturas"],
  miniatures: ["Miniaturas"],
  miniaturas: ["Miniaturas"],
  "dungeon-crawler": ["Dungeon Crawler"],
  "dungeon-crawl": ["Dungeon Crawler"],
  mazmorras: ["Dungeon Crawler"],
  "roll-and-write": ["Roll & Write"],
  "roll-write": ["Roll & Write"],
  "roll-and-write-print-and-play": ["Roll & Write"],
  "deck-building": ["Deckbuilding"],
  "construccion-de-mazos": ["Deckbuilding"],
  cartas: ["Cartas"],
  "juegos-de-cartas": ["Cartas"],
  "card-game": ["Cartas"],
  solitario: ["Solitario"],
  solo: ["Solitario"],
  "en-solitario": ["Solitario"],
  "dos-jugadores": ["Dos jugadores"],
  "2-jugadores": ["Dos jugadores"],
  "para-2": ["Dos jugadores"],
  "para-dos": ["Dos jugadores"],
  abstracto: ["Abstracto"],
  abstracta: ["Abstracto"],
  "clasicos-modernos": ["Clásicos modernos"],
  clasico: ["Clásicos modernos"],
  clasicos: ["Clásicos modernos"],
  deduccion: ["Deducción"],
  "roles-ocultos": ["Deducción"],
  faroleo: ["Deducción"]
};

const mechanicAliases: Record<string, CanonicalMechanic[] | null> = {
  tablero: null,
  tableros: null,
  ficha: null,
  fichas: null,
  pieza: null,
  piezas: null,
  cartas: null,
  carta: null,
  dados: null,
  dado: null,
  interaccion: null,
  accesible: null,
  movimiento: null,
  movimientos: null,
  mover: null,
  puzzle: null,
  bloqueo: null,
  bloquear: null,
  familiar: null,
  estrategia: null,
  "gestion-de-cartas": ["Gestión de mano"],
  "gestion-de-mano-de-cartas": ["Gestión de mano"],
  "hand-management": ["Gestión de mano"],
  "construccion-de-mazos": ["Deckbuilding"],
  "creacion-de-mazo": ["Deckbuilding"],
  "creacion-de-mazos": ["Deckbuilding"],
  "deck-building": ["Deckbuilding"],
  "construccion-de-motor": ["Engine building"],
  "motor-de-combos": ["Engine building"],
  "engine-building": ["Engine building"],
  "coleccion-de-sets": ["Set collection"],
  "coleccion-de-conjuntos": ["Set collection"],
  "set-collecting": ["Set collection"],
  "set-collection": ["Set collection"],
  "control-de-areas": ["Area control"],
  "control-de-area": ["Area control"],
  "area-control": ["Area control"],
  draft: ["Draft de cartas"],
  drafting: ["Draft de cartas"],
  "draft-de-cartas": ["Draft de cartas"],
  "tienta-la-suerte": ["Push your luck"],
  "forzar-la-suerte": ["Push your luck"],
  "empujar-tu-suerte": ["Push your luck"],
  "push-your-luck": ["Push your luck"],
  "combate-con-dados": ["Combate con dados"],
  "dados-de-combate": ["Combate con dados"],
  "dice-combat": ["Combate con dados"],
  "dice-resolution": ["Combate con dados"],
  "colocacion-de-piezas": ["Colocación de losetas"],
  "colocacion-de-losetas": ["Colocación de losetas"],
  loseta: ["Colocación de losetas"],
  losetas: ["Colocación de losetas"],
  trabajadores: ["Colocación de trabajadores"],
  "colocacion-de-trabajadores": ["Colocación de trabajadores"],
  "worker-placement": ["Colocación de trabajadores"],
  "gestion-de-recursos": ["Gestión de recursos"],
  recursos: ["Gestión de recursos"],
  mayorias: ["Mayorías"],
  negociacion: ["Negociación"],
  comercio: ["Negociación"],
  subastas: ["Negociación"],
  subasta: ["Negociación"],
  deduccion: ["Deducción"],
  "deduccion-social": ["Deducción", "Roles ocultos"],
  roles: ["Roles ocultos"],
  "roles-ocultos": ["Roles ocultos"],
  votacion: ["Roles ocultos"],
  "eliminacion-de-jugadores": ["Roles ocultos"],
  moderador: ["Roles ocultos"],
  cooperativo: ["Cooperativo"],
  cooperativa: ["Cooperativo"],
  cooperacion: ["Cooperativo"],
  coordinacion: ["Cooperativo"],
  campana: ["Campaña"],
  legacy: ["Legacy"],
  wargame: ["Wargame"],
  "juego-de-guerra": ["Wargame"],
  rutas: ["Rutas y redes"],
  "rutas-y-redes": ["Rutas y redes"],
  redes: ["Rutas y redes"],
  "desarrollo-de-redes": ["Rutas y redes"],
  "construccion-de-rutas": ["Rutas y redes"],
  carrera: ["Rutas y redes"],
  carreras: ["Rutas y redes"],
  "programacion-de-acciones": null
};

export function isTaxonomyType(value: unknown): value is TaxonomyTypeKey {
  return value === "category" || value === "mechanic" || value === "theme";
}

export function isCanonicalCategory(value: string): value is CanonicalCategory {
  return canonicalCategorySet.has(value);
}

export function isCanonicalMechanic(value: string): value is CanonicalMechanic {
  return canonicalMechanicSet.has(value);
}

export function normalizeCategories(input: unknown): string[] {
  return normalizeCanonicalList(input, {
    canonical: CANONICAL_CATEGORIES,
    byKey: categoriesByKey,
    aliases: categoryAliases,
    label: "category"
  });
}

export function normalizeMechanics(input: unknown): string[] {
  return normalizeCanonicalList(input, {
    canonical: CANONICAL_MECHANICS,
    byKey: mechanicsByKey,
    aliases: mechanicAliases,
    label: "mechanic"
  });
}

export function normalizeTaxonomyMetadata<T extends Record<string, unknown>>(metadata: T): T {
  const next: Record<string, unknown> = { ...metadata };
  const rawCategories = [
    ...readStringValues(next.categories),
    ...readStringValues(next.categoryHints)
  ];
  const rawMechanics = [
    ...readStringValues(next.mechanics),
    ...readStringValues(next.mechanicHints)
  ];

  if (rawCategories.length || "categories" in next || "categoryHints" in next) {
    const categories = normalizeCategories(rawCategories);
    next.categories = categories;
    next.categoryHints = categories;
  }

  if (rawMechanics.length || "mechanics" in next || "mechanicHints" in next) {
    const mechanics = normalizeMechanics(rawMechanics);
    next.mechanics = mechanics;
    next.mechanicHints = mechanics;
  }

  return next as T;
}

export async function getAdminTaxonomyTerms(type: TaxonomyTypeKey) {
  const prisma = await getPrismaClient();
  return prisma.taxonomyTerm.findMany({
    where: { type },
    orderBy: [{ name: "asc" }]
  });
}

export async function getTaxonomyTermNames(type: TaxonomyTypeKey) {
  try {
    return await getCachedTaxonomyTermNames(type);
  } catch (error) {
    if (!isMissingIncrementalCacheError(error)) {
      throw error;
    }

    return getDirectTaxonomyTermNames(type);
  }
}

async function getCachedTaxonomyTermNames(type: TaxonomyTypeKey) {
  const { unstable_cache } = await import("next/cache");
  const cached = unstable_cache(
    async function cachedTaxonomyTermNames(innerType: TaxonomyTypeKey) {
      return getDirectTaxonomyTermNames(innerType);
    },
    ["taxonomy-term-names"],
    { revalidate: 3600, tags: ["public-taxonomy"] }
  );

  return cached(type);
}

async function getDirectTaxonomyTermNames(type: TaxonomyTypeKey) {
  if (type === "category") {
    return [...CANONICAL_CATEGORIES];
  }

  if (type === "mechanic") {
    return [...CANONICAL_MECHANICS];
  }

  const prisma = await getPrismaClient();
  const terms = await prisma.taxonomyTerm.findMany({
    where: { type },
    orderBy: [{ name: "asc" }],
    select: { name: true }
  });

  return terms.map((term) => term.name);
}

export async function createTaxonomyTerm(type: TaxonomyTypeKey, rawName: unknown) {
  const prisma = await getPrismaClient();
  const name = normalizeTermName(type, rawName);
  const slug = normalizeTermSlug(name);

  return prisma.taxonomyTerm.create({
    data: {
      type,
      name,
      slug
    }
  });
}

export async function renameTaxonomyTerm(id: unknown, rawName: unknown) {
  const prisma = await getPrismaClient();
  const termId = normalizeTermId(id);
  const existingTerm = await prisma.taxonomyTerm.findUnique({ where: { id: termId } });

  if (!existingTerm) {
    throw new Error("No existe ese término.");
  }

  const name = normalizeTermName(existingTerm.type, rawName);
  const slug = normalizeTermSlug(name);

  if (existingTerm.name === name && existingTerm.slug === slug) {
    return existingTerm;
  }

  const { Prisma } = await import("@prisma/client");
  const column = taxonomyColumn(existingTerm.type as TaxonomyTypeKey, Prisma);

  const [updatedTerm] = await prisma.$transaction([
    prisma.taxonomyTerm.update({
      where: { id: existingTerm.id },
      data: { name, slug }
    }),
    prisma.$executeRaw`
      UPDATE "Game"
      SET ${column} = array_replace(${column}, ${existingTerm.name}, ${name})
      WHERE ${existingTerm.name} = ANY(${column})
    `
  ]);

  return updatedTerm;
}

export async function deleteTaxonomyTerm(id: unknown) {
  const prisma = await getPrismaClient();
  const termId = normalizeTermId(id);
  const existingTerm = await prisma.taxonomyTerm.findUnique({ where: { id: termId } });

  if (!existingTerm) {
    throw new Error("No existe ese término.");
  }

  const { Prisma } = await import("@prisma/client");
  const column = taxonomyColumn(existingTerm.type as TaxonomyTypeKey, Prisma);

  await prisma.$transaction([
    prisma.$executeRaw`
      UPDATE "Game"
      SET ${column} = array_remove(${column}, ${existingTerm.name})
      WHERE ${existingTerm.name} = ANY(${column})
    `,
    prisma.taxonomyTerm.delete({ where: { id: existingTerm.id } })
  ]);
}

export function taxonomyErrorMessage(error: unknown) {
  if (isPrismaUniqueConstraintError(error)) {
    return "Ya existe un término con ese nombre.";
  }

  return error instanceof Error ? error.message : "No se pudo guardar el término.";
}

function normalizeTermId(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("Falta el identificador del término.");
  }

  return value.trim();
}

function normalizeTermName(type: TaxonomyTypeKey, value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("El nombre del término es obligatorio.");
  }

  const rawName = value.trim().replace(/\s+/g, " ");

  if (type === "category") {
    const [category] = normalizeCategories([rawName]);
    if (!category) {
      throw new Error("La categoría no pertenece a la taxonomía canónica.");
    }
    return category;
  }

  if (type === "mechanic") {
    const [mechanic] = normalizeMechanics([rawName]);
    if (!mechanic) {
      throw new Error("La mecánica no pertenece a la taxonomía canónica.");
    }
    return mechanic;
  }

  return rawName;
}

function normalizeTermSlug(name: string) {
  const slug = slugify(name);

  if (!slug) {
    throw new Error("El nombre no genera un slug válido.");
  }

  return slug;
}

async function getPrismaClient() {
  const { prisma } = await import("@/lib/prisma");
  return prisma;
}

function taxonomyColumn(type: TaxonomyTypeKey, prismaRuntime: { raw(value: string): unknown }) {
  if (type === "category") {
    return prismaRuntime.raw('"categories"');
  }

  if (type === "mechanic") {
    return prismaRuntime.raw('"mechanics"');
  }

  return prismaRuntime.raw('"themes"');
}

function isPrismaUniqueConstraintError(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: unknown }).code === "P2002"
  );
}

function isMissingIncrementalCacheError(error: unknown) {
  return error instanceof Error && /incrementalCache missing/i.test(error.message);
}

function normalizeCanonicalList(
  input: unknown,
  config: {
    canonical: readonly string[];
    byKey: Map<string, string>;
    aliases: Record<string, string[] | null>;
    label: string;
  }
) {
  const values = readStringValues(input);
  const selected = new Set<string>();

  for (const value of values) {
    const key = taxonomyKey(value);
    const canonical = config.byKey.get(key);
    const mapped = canonical ? [canonical] : config.aliases[key];

    if (mapped === null) {
      warnDroppedTaxonomyValue(config.label, value);
      continue;
    }

    if (!mapped?.length) {
      warnDroppedTaxonomyValue(config.label, value);
      continue;
    }

    for (const item of mapped) {
      selected.add(item);
    }
  }

  return config.canonical.filter((term) => selected.has(term));
}

function readStringValues(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input.flatMap(readStringValues);
  }

  if (typeof input === "string") {
    return input
      .split(/\r?\n|[,;]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function buildCanonicalLookup(values: readonly string[]) {
  return new Map(values.map((value) => [taxonomyKey(value), value]));
}

function taxonomyKey(value: string) {
  return slugify(value)
    .replace(/^juegos?-de-/, "")
    .replace(/^tipo-/, "");
}

function warnDroppedTaxonomyValue(label: string, value: string) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.warn(`[MeepleTavern] Dropped non-canonical ${label}: ${value}`);
}
