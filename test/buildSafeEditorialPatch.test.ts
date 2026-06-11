import test from "node:test";
import assert from "node:assert/strict";
import { GameStatus } from "@prisma/client";
import type { EditorialCompletion } from "@/lib/ai/editorialCompletionSchema";
import { buildSafeEditorialPatch } from "@/lib/games/buildSafeEditorialPatch";

function buildGame(overrides: Partial<Parameters<typeof buildSafeEditorialPatch>[0]> = {}): Parameters<typeof buildSafeEditorialPatch>[0] {
  return {
    id: "game_1",
    name: "Maldito Games",
    slug: "maldito-games-2",
    status: GameStatus.draft,
    title: "Maldito Games",
    originalTitle: null,
    year: null,
    players: {},
    imageUrl: null,
    coverImageUrl: null,
    coverImageAlt: "",
    imageSourceName: null,
    imageSourceUrl: null,
    imageLicenseNote: null,
    imageStatus: "missing",
    description: "Fuente original: https://www.amazon.es/dp/B0ABC12345",
    review: null,
    shortSummary: "Amazon · ficha importada para revisión.",
    shortDescription: "Amazon · ficha importada para revisión.",
    quickVerdict: null,
    pros: [],
    cons: [],
    bestFor: null,
    notFor: null,
    minPlayers: null,
    maxPlayers: null,
    playtime: null,
    age: null,
    minAge: null,
    complexity: null,
    difficulty: null,
    categories: ["Añadir al carrito"],
    mechanics: [],
    themes: [],
    publisher: "Maldito Games",
    spanishPublisher: null,
    similarGames: [],
    faqs: [],
    faq: [],
    seoTitle: "Maldito Games | MeepleTavern",
    seoDescription: null,
    ratings: {},
    buyUrl: "https://www.amazon.es/dp/B0ABC12345",
    sources: [],
    sourceIds: [],
    primaryImageId: null,
    imageFallbackAccepted: false,
    createdByAi: false,
    createdAt: new Date("2026-06-10T10:00:00.000Z"),
    updatedAt: new Date("2026-06-10T10:00:00.000Z"),
    publishedAt: null,
    ...overrides
  } as Parameters<typeof buildSafeEditorialPatch>[0];
}

test("buildSafeEditorialPatch fills only replaceable editorial fields", () => {
  const completion: EditorialCompletion = {
    cleanTitle: "Brass Birmingham",
    publisher: "Roxley",
    minPlayers: 2,
    maxPlayers: 4,
    minPlayTime: 60,
    maxPlayTime: 120,
    minAge: 14,
    shortDescription: "Euro exigente sobre redes, industria y timing.",
    longDescription: "Brass Birmingham premia la planificación de mano, el tempo de los ingresos y la lectura del mapa compartido.",
    difficulty: "Alta",
    categories: ["Estrategia", "Eurogame"],
    mechanics: ["Gestión de mano", "Desarrollo de redes"],
    themes: ["Industria", "Inglaterra"],
    bestFor: "Mesas que disfrutan optimizando turnos con interacción indirecta.",
    notFor: "Quien prefiera juegos ligeros o decisiones inmediatas.",
    pros: ["Alta profundidad táctica", "Escala bien entre jugadores", "Interacción constante en el mapa"],
    cons: ["Explicación inicial exigente", "Castiga errores de tempo"],
    faq: [
      { question: "¿Es duro de aprender?", answer: "Tiene reglas accesibles, pero dominar el tempo lleva partidas." },
      { question: "¿Funciona a dos?", answer: "Sí, mantiene tensión y control del mapa." },
      { question: "¿Qué destaca?", answer: "La gestión de mano y la lucha por redes e ingresos." }
    ],
    seoTitle: "Brass Birmingham: reseña, dificultad y opinión",
    seoDescription: "Guía de Brass Birmingham con dificultad, sensaciones de partida, pros, contras y público ideal.",
    confidence: "high",
    warnings: ["El título actual parece una editorial, no el juego."]
  };

  const result = buildSafeEditorialPatch(buildGame(), completion);

  assert.deepEqual(result.appliedFields, [
    "shortDescription",
    "longDescription",
    "difficulty",
    "categories",
    "mechanics",
    "themes",
    "bestFor",
    "notFor",
    "pros",
    "cons",
    "faq",
    "seoTitle",
    "seoDescription"
  ]);
  assert.equal(result.patch.shortDescription, completion.shortDescription);
  assert.equal(result.patch.shortSummary, completion.shortDescription);
  assert.equal(result.patch.description, completion.longDescription);
  assert.equal(result.patch.difficulty, "Alta");
  assert.equal(result.patch.complexity, "Alta");
  assert.equal(result.suggestedTitle, "Brass Birmingham");
});

test("buildSafeEditorialPatch keeps existing good editorial content", () => {
  const result = buildSafeEditorialPatch(
    buildGame({
      title: "Heat",
      name: "Heat",
      shortDescription: "Juego de carreras ágil y muy tenso.",
      shortSummary: "Juego de carreras ágil y muy tenso.",
      description: "Heat convierte cada curva en una decisión entre velocidad, calor y control.",
      difficulty: "Media",
      complexity: "Media",
      categories: ["Carreras"],
      mechanics: ["Gestión de mano"],
      themes: ["Motor"],
      bestFor: "Grupos que quieren tensión inmediata.",
      notFor: "Quien busque eurogames largos.",
      pros: ["Ritmo excelente", "Escala bien", "Turnos rápidos"],
      cons: ["Algo caótico a más jugadores", "Explicación inicial media"],
      faq: [{ question: "¿Escala bien?", answer: "Sí, mantiene emoción." }],
      faqs: [{ question: "¿Escala bien?", answer: "Sí, mantiene emoción." }],
      seoTitle: "Heat: reseña y opinión",
      seoDescription: "Heat en español con reseña breve, dificultad y sensaciones."
    }),
    {
      cleanTitle: "Heat",
      publisher: "Days of Wonder",
      minPlayers: 1,
      maxPlayers: 6,
      minPlayTime: 30,
      maxPlayTime: 60,
      minAge: 10,
      shortDescription: "Otra propuesta",
      longDescription: "Otro texto",
      difficulty: "Alta",
      categories: ["Estrategia"],
      mechanics: ["Draft"],
      themes: ["Deporte"],
      bestFor: "Otro público",
      notFor: "Otro público",
      pros: ["Uno", "Dos", "Tres"],
      cons: ["Uno", "Dos"],
      faq: [
        { question: "Uno", answer: "Uno" },
        { question: "Dos", answer: "Dos" },
        { question: "Tres", answer: "Tres" }
      ],
      seoTitle: "Otro SEO",
      seoDescription: "Otra meta",
      confidence: "medium",
      warnings: []
    }
  );

  assert.deepEqual(result.appliedFields, []);
  assert.deepEqual(result.patch, {});
  assert.equal(result.suggestedTitle, null);
});

test("buildSafeEditorialPatch can prefer model completion during import flows", () => {
  const result = buildSafeEditorialPatch(
    buildGame({
      title: "Rebel Nemesis",
      name: "Rebel Nemesis",
      shortDescription: "Rebel Nemesis es un juego cooperativo para 5 jugadores.",
      shortSummary: "Rebel Nemesis es un juego cooperativo para 5 jugadores.",
      description: "Rebel Nemesis propone una experiencia cooperativa pensada para coordinar decisiones de grupo.",
      categories: ["Cooperativo"],
      mechanics: ["Cartas"],
      themes: ["Ciencia ficción"]
    }),
    {
      cleanTitle: "Rebel Nemesis",
      publisher: "Awaken Realms",
      minPlayers: 1,
      maxPlayers: 5,
      minPlayTime: 90,
      maxPlayTime: 180,
      minAge: 14,
      shortDescription: "Cooperativo de supervivencia espacial para grupos que disfrutan la presión constante y la coordinación.",
      longDescription: "Rebel Nemesis plantea una lucha tensa por sobrevivir en una nave hostil, con decisiones compartidas y amenazas que obligan a coordinar cada turno.",
      difficulty: "Alta",
      categories: ["Cooperativo", "Temático"],
      mechanics: ["Gestión de mano", "Cooperación"],
      themes: ["Ciencia ficción", "Supervivencia"],
      bestFor: "Mesas que disfrutan de presión, coordinación y narrativa emergente.",
      notFor: "Quien busque partidas relajadas o poco confrontadas con el sistema.",
      pros: ["Tensión constante", "Muy buena conversación de mesa", "Tema integrado en las decisiones"],
      cons: ["Puede castigar errores pronto", "Exige implicación del grupo"],
      faq: [
        { question: "¿Es cooperativo?", answer: "Sí, toda la mesa comparte objetivos y presión." },
        { question: "¿Tiene mucha tensión?", answer: "Sí, la sensación de amenaza es una de sus claves." },
        { question: "¿Encaja en grupos expertos?", answer: "Sí, sobre todo si disfrutan optimizando en equipo." }
      ],
      seoTitle: "Rebel Nemesis: supervivencia cooperativa espacial",
      seoDescription: "Ficha editorial de Rebel Nemesis con sensaciones, dificultad y tipo de experiencia.",
      confidence: "high",
      warnings: []
    },
    { mode: "prefer_completion" }
  );

  assert.equal(result.patch.shortDescription, "Cooperativo de supervivencia espacial para grupos que disfrutan la presión constante y la coordinación.");
  assert.equal(result.patch.description, "Rebel Nemesis plantea una lucha tensa por sobrevivir en una nave hostil, con decisiones compartidas y amenazas que obligan a coordinar cada turno.");
  assert.deepEqual(result.patch.mechanics, ["Gestión de mano", "Cooperación"]);
  assert.equal(result.patch.publisher, "Awaken Realms");
  assert.equal(result.patch.minPlayers, 1);
  assert.equal(result.patch.maxPlayers, 5);
  assert.equal(result.patch.playtime, "90-180 min");
  assert.equal(result.patch.minAge, 14);
});

test("buildSafeEditorialPatch can replace suspicious imported titles during prefer_completion", () => {
  const result = buildSafeEditorialPatch(
    buildGame({
      title: "Maldito Games",
      name: "Maldito Games",
      slug: "maldito-games"
    }),
    {
      cleanTitle: "Brass Birmingham",
      publisher: "Roxley",
      minPlayers: 2,
      maxPlayers: 4,
      minPlayTime: 60,
      maxPlayTime: 120,
      minAge: 14,
      shortDescription: "Euro exigente sobre redes, industria y timing.",
      longDescription: "Brass Birmingham premia la planificación de mano y la lectura del mapa compartido.",
      difficulty: "Alta",
      categories: ["Estrategia", "Eurogame"],
      mechanics: ["Gestión de mano", "Desarrollo de redes"],
      themes: ["Industria"],
      bestFor: "Mesas que disfrutan optimizando turnos.",
      notFor: "Quien prefiera juegos ligeros.",
      pros: ["Alta profundidad táctica", "Interacción constante", "Escala bien"],
      cons: ["Explicación inicial exigente", "Castiga errores de tempo"],
      faq: [
        { question: "¿Es duro de aprender?", answer: "Tiene reglas accesibles, pero dominarlo lleva partidas." },
        { question: "¿Funciona a dos?", answer: "Sí, mantiene tensión y control del mapa." },
        { question: "¿Qué destaca?", answer: "La gestión de mano y la lucha por redes." }
      ],
      seoTitle: "Brass Birmingham: reseña y opinión",
      seoDescription: "Ficha editorial de Brass Birmingham con dificultad y sensaciones.",
      confidence: "high",
      warnings: []
    },
    { mode: "prefer_completion" }
  );

  assert.equal(result.patch.title, "Brass Birmingham");
  assert.equal(result.patch.name, "Brass Birmingham");
  assert.equal(result.patch.slug, "brass-birmingham");
});
