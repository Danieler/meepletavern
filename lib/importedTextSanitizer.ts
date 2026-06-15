import { slugify } from "@/lib/slug";

export type ImportedListFieldType = "themes" | "categories" | "mechanics" | "tags";

const COMMERCIAL_GARBAGE_PATTERN =
  /(seguridad de pagos|encripta tu informaci[oó]n|durante la transacci[oó]n|pol[ií]tica de devoluciones|devoluciones gratis|env[ií]o gratis|\bamazon\b|compra verificada|n[uú]mero de modelo|clasificaci[oó]n en los m[aá]s vendidos|producto en amazon|a[nñ]adir al carrito|comprar ahora|patrocinado|otros vendedores|frecuentemente comprados juntos|\bprecio\b|iva incluido|cup[oó]n|oferta|entrega|disponibilidad|garant[ií]a|transacci[oó]n|checkout|vendedor|tarjeta|cliente|pago)/i;

const TRUNCATED_GARBAGE_PATTERN = /\b(tra|transa|informaci[oó]|devolu|garant|disponi)$/i;

export function sanitizeImportedText(text: string): string | null {
  const cleaned = normalizeText(text);

  if (!cleaned || COMMERCIAL_GARBAGE_PATTERN.test(cleaned)) {
    return null;
  }

  if (cleaned.length > 280 || TRUNCATED_GARBAGE_PATTERN.test(cleaned)) {
    return null;
  }

  return cleaned;
}

export function sanitizeAmazonImportedText(text: string) {
  return sanitizeImportedText(text);
}

export function sanitizeImportedTitle(title: string) {
  let cleaned = normalizeText(title);

  if (!cleaned) {
    return "";
  }

  while (true) {
    const bracketMatch = /(?:\s*[\[(]\s*([^\[\]()]{1,24})\s*[\])]\s*)$/.exec(cleaned);
    if (!bracketMatch) {
      break;
    }

    if (!looksLikeImportedCode(bracketMatch[1])) {
      break;
    }

    cleaned = cleaned.slice(0, bracketMatch.index).trimEnd();
  }

  cleaned = cleaned
    .replace(/^Hasbro\s+Gaming\s*,\s*/i, "")
    .replace(/\s*(?:[+·|/-]\s*)?promo(?:ci[oó]n)?\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();

  cleaned = normalizeRiskTitle(cleaned);
  return cleaned;
}

export function sanitizeImportedList(values: string[], fieldType: ImportedListFieldType): string[] {
  const maxWords = fieldType === "tags" ? 5 : fieldType === "themes" ? 3 : 4;
  const seen = new Map<string, string>();

  for (const value of values) {
    const cleaned = sanitizeImportedText(value);
    if (!cleaned || cleaned.length > 42 || countWords(cleaned) > maxWords || looksLikeSentence(cleaned)) {
      continue;
    }

    const normalized =
      fieldType === "themes"
        ? normalizeThemeTag(cleaned)
        : fieldType === "mechanics"
          ? normalizeMechanicTag(cleaned)
          : normalizeTag(cleaned);
    if (!normalized || TRUNCATED_GARBAGE_PATTERN.test(normalized)) {
      continue;
    }

    seen.set(slugify(normalized), normalized);
  }

  return [...seen.values()];
}

export function sanitizeImportedFacts(facts: Record<string, string>) {
  const cleanFacts: Record<string, string> = {};
  let discardedCount = 0;

  for (const [key, value] of Object.entries(facts)) {
    const cleaned = sanitizeImportedText(value);
    if (cleaned) {
      cleanFacts[key] = cleaned;
    } else {
      discardedCount += 1;
    }
  }

  return { facts: cleanFacts, discardedCount };
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeRiskTitle(value: string) {
  if (!/^Risk\b/i.test(value)) {
    return value;
  }

  const suffix = value.replace(/^Risk\b\s*/i, "").trim();
  if (!suffix) {
    return "Risk";
  }

  if (
    /^[:,-]/.test(suffix) &&
    /(conquista|estrat[eé]gica|ej[eé]rcito|juguete|tablero mundial|territorios|continentes|juegos para fiestas|regalo|multijugador|acci[oó]n|aventura)/i.test(suffix)
  ) {
    return "Risk";
  }

  return value;
}

function looksLikeImportedCode(value: string) {
  const normalized = value.replace(/\s+/g, "").trim();
  return Boolean(
    normalized &&
      normalized.length <= 24 &&
      /\d/.test(normalized) &&
      !/\s/.test(value) &&
      /^[A-Za-z0-9.-]+$/.test(normalized)
  );
}

function countWords(value: string) {
  return value.split(/\s+/).filter(Boolean).length;
}

function looksLikeSentence(value: string) {
  return /[.!?¿¡]/.test(value) || /\b(de|durante|para|con|por|tu|se|el|la|los|las)\b.+\b(de|durante|para|con|por|tu|se|el|la|los|las)\b/i.test(value);
}

function normalizeTag(value: string) {
  const lower = value.toLocaleLowerCase("es");
  return lower ? `${lower[0].toLocaleUpperCase("es")}${lower.slice(1)}`.trim() : "";
}

const MECHANIC_ALIASES: Record<string, string | null> = {
  tablero: null,
  tableros: null,
  ficha: "Colocación de piezas",
  fichas: "Colocación de piezas",
  pieza: "Colocación de piezas",
  piezas: "Colocación de piezas",
  loseta: "Colocación de losetas",
  losetas: "Colocación de losetas",
  movimiento: "Movimiento",
  movimientos: "Movimiento",
  mover: "Movimiento",
  bloqueo: "Bloqueo",
  bloquear: "Bloqueo",
  abstracto: "Abstracto",
  abstracta: "Abstracto",
  cartas: "Gestión de mano",
  carta: "Gestión de mano",
  dados: "Dados",
  dado: "Dados",
  draft: "Draft",
  subasta: "Subastas",
  subastas: "Subastas",
  comercio: "Negociación",
  negociacion: "Negociación",
  roles: "Roles ocultos",
  "roles-ocultos": "Roles ocultos",
  deduccion: "Deducción",
  "deduccion-social": "Deducción social",
  cooperativo: "Cooperativo",
  cooperativa: "Cooperativo",
  mayorias: "Mayorías",
  control: "Control de áreas",
  "control-de-areas": "Control de áreas",
  "colocacion-de-trabajadores": "Colocación de trabajadores",
  trabajadores: "Colocación de trabajadores",
  "construccion-de-mazos": "Construcción de mazos",
  mazos: "Construcción de mazos",
  "gestion-de-recursos": "Gestión de recursos",
  recursos: "Gestión de recursos",
  "set-collection": "Colección de sets",
  coleccion: "Colección de sets",
  "coleccion-de-sets": "Colección de sets",
  carrera: "Carrera",
  carreras: "Carrera",
  memoria: "Memoria",
  narrativo: "Narrativo",
  legacy: "Legacy",
  campaña: "Campaña",
  campana: "Campaña"
};

const GENERIC_MECHANICS = new Set([
  "Abstracto",
  "Bloqueo",
  "Movimiento",
  "Colocación de piezas",
  "Colocación de losetas",
  "Colocación de trabajadores",
  "Control de áreas",
  "Mayorías",
  "Gestión de mano",
  "Gestión de recursos",
  "Construcción de mazos",
  "Colección de sets",
  "Draft",
  "Dados",
  "Subastas",
  "Negociación",
  "Roles ocultos",
  "Deducción",
  "Deducción social",
  "Cooperativo",
  "Carrera",
  "Memoria",
  "Narrativo",
  "Legacy",
  "Campaña"
]);

function normalizeMechanicTag(value: string) {
  const normalized = normalizeTag(value);
  const key = slugify(normalized);
  const alias = MECHANIC_ALIASES[key];

  if (alias === null) {
    return "";
  }

  if (alias) {
    return alias;
  }

  return GENERIC_MECHANICS.has(normalized) ? normalized : "";
}

const THEME_ALIASES: Record<string, string | null> = {
  abeja: "Insectos",
  abejas: "Insectos",
  arana: "Insectos",
  aranas: "Insectos",
  aracnidos: "Insectos",
  bichos: "Insectos",
  insecto: "Insectos",
  insectos: "Insectos",
  hormiga: "Insectos",
  hormigas: "Insectos",
  reina: null,
  reinas: null,
  colmena: "Insectos",
  panal: "Insectos",
  animal: "Animales",
  animales: "Animales",
  naturaleza: "Naturaleza",
  bosque: "Naturaleza",
  bosques: "Naturaleza",
  fantasia: "Fantasía",
  medieval: "Medieval",
  magia: "Fantasía",
  magos: "Fantasía",
  dragones: "Fantasía",
  mazmorra: "Mazmorras",
  mazmorras: "Mazmorras",
  dungeon: "Mazmorras",
  terror: "Terror",
  horror: "Terror",
  cthulhu: "Cthulhu",
  lovecraft: "Cthulhu",
  zombies: "Zombies",
  zombie: "Zombies",
  vampiros: "Vampiros",
  vampiro: "Vampiros",
  monstruos: "Monstruos",
  monstruo: "Monstruos",
  espacio: "Espacio",
  espacial: "Espacio",
  scifi: "Ciencia ficción",
  "sci-fi": "Ciencia ficción",
  "ciencia-ficcion": "Ciencia ficción",
  futurista: "Ciencia ficción",
  robots: "Robots",
  robot: "Robots",
  cyberpunk: "Cyberpunk",
  steampunk: "Steampunk",
  aventura: "Aventura",
  exploracion: "Exploración",
  piratas: "Piratas",
  pirata: "Piratas",
  mitologia: "Mitología",
  mitologico: "Mitología",
  historico: "Histórico",
  historia: "Histórico",
  guerra: "Guerra",
  militar: "Guerra",
  politica: "Política",
  civilizacion: "Civilización",
  economia: "Economía",
  comercio: "Economía",
  ciudad: "Ciudades",
  ciudades: "Ciudades",
  construccion: "Construcción",
  tren: "Trenes",
  trenes: "Trenes",
  agricultura: "Agricultura",
  granja: "Agricultura",
  granjas: "Agricultura",
  cocina: "Cocina",
  comida: "Cocina",
  arte: "Arte",
  musica: "Música",
  literatura: "Literatura",
  cine: "Cine",
  misterio: "Misterio",
  crimen: "Crimen",
  detectives: "Crimen",
  detective: "Crimen",
  espionaje: "Espionaje",
  deportes: "Deportes",
  deporte: "Deportes",
  carreras: "Carreras",
  western: "Western",
  humor: "Humor",
  dinosaurios: "Dinosaurios",
  dinosaurio: "Dinosaurios",
  postapocaliptico: "Postapocalíptico",
  apocalipsis: "Postapocalíptico",
  supervivencia: "Supervivencia"
};

const GENERIC_THEMES = new Set([
  "Animales",
  "Naturaleza",
  "Insectos",
  "Fantasía",
  "Medieval",
  "Mazmorras",
  "Terror",
  "Cthulhu",
  "Zombies",
  "Vampiros",
  "Monstruos",
  "Espacio",
  "Ciencia ficción",
  "Robots",
  "Cyberpunk",
  "Steampunk",
  "Aventura",
  "Exploración",
  "Piratas",
  "Mitología",
  "Histórico",
  "Guerra",
  "Política",
  "Civilización",
  "Economía",
  "Ciudades",
  "Construcción",
  "Trenes",
  "Agricultura",
  "Cocina",
  "Arte",
  "Música",
  "Literatura",
  "Cine",
  "Misterio",
  "Crimen",
  "Espionaje",
  "Deportes",
  "Carreras",
  "Western",
  "Humor",
  "Dinosaurios",
  "Postapocalíptico",
  "Supervivencia"
]);

function normalizeThemeTag(value: string) {
  const normalized = normalizeTag(value);
  const key = slugify(normalized);
  const alias = THEME_ALIASES[key];

  if (alias === null) {
    return "";
  }

  if (alias) {
    return alias;
  }

  return GENERIC_THEMES.has(normalized) ? normalized : "";
}
