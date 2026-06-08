import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const heroImage =
  "https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&w=1200&q=80";

const games = [
  {
    name: "Catan",
    slug: "catan",
    shortSummary:
      "Un clásico de negociación, expansión y gestión de recursos que sigue funcionando muy bien como puerta de entrada.",
    description:
      "Catan propone colonizar una isla modular produciendo madera, arcilla, trigo, ovejas y mineral. Su mezcla de comercio, azar controlado y carrera por los puntos lo convierte en una ficha imprescindible para quienes empiezan a explorar juegos modernos.",
    review:
      "Funciona especialmente bien con grupos habladores. No es el diseño más moderno del mercado, pero conserva una claridad de objetivos y una tensión social que explican su fama.",
    pros: ["Reglas accesibles", "Mucha interacción en mesa", "Alta rejugabilidad por el tablero modular"],
    cons: ["Puede depender bastante de las tiradas", "El bloqueo entre jugadores puede frustrar"],
    bestFor: "Grupos que disfrutan negociando y entrando en juegos modernos sin demasiada carga de reglas.",
    notFor: "Jugadores que prefieren partidas con control estratégico absoluto y poco azar.",
    minPlayers: 3,
    maxPlayers: 4,
    playtime: "60-90 min",
    age: "10+",
    complexity: "Media ligera",
    categories: ["Estrategia familiar", "Negociación", "Clásicos modernos"],
    mechanics: ["Comercio", "Construcción de rutas", "Gestión de recursos", "Tablero modular"],
    themes: ["Colonización", "Comercio"],
    similarGames: ["Carcassonne", "Aventureros al Tren", "Stone Age"],
    seoTitle: "Catan: reseña, duración, jugadores y opinión",
    seoDescription:
      "Ficha de Catan en español: resumen, opinión, duración, jugadores, pros, contras y juegos parecidos.",
    faqs: [
      {
        question: "¿Catan merece la pena hoy?",
        answer:
          "Sí, sobre todo como juego social y familiar. Hay diseños más recientes, pero Catan mantiene una entrada muy clara al hobby."
      },
      {
        question: "¿Cuántos jugadores admite Catan?",
        answer: "La caja base suele funcionar de 3 a 4 jugadores."
      }
    ],
    sources: [{ label: "Datos aproximados de referencia editorial", url: "" }]
  },
  {
    name: "Carcassonne",
    slug: "carcassonne",
    shortSummary:
      "Colocación de losetas sencilla, elegante y con una curva táctica sorprendente.",
    description:
      "En Carcassonne los jugadores construyen un mapa compartido de ciudades, caminos, monasterios y campos. Cada loseta abre pequeñas decisiones sobre cuándo puntuar, cuándo bloquear y cuánto arriesgar.",
    review:
      "Es uno de los mejores juegos para enseñar en pocos minutos. Su ritmo ágil y su mesa visual lo hacen ideal para partidas repetidas sin sensación de trámite.",
    pros: ["Explicación muy rápida", "Escala bien con distintos perfiles", "Partidas ágiles"],
    cons: ["La interacción en campos puede resultar menos intuitiva", "El azar de losetas pesa en algunas partidas"],
    bestFor: "Familias, parejas y grupos que quieren estrategia visible sin reglas densas.",
    notFor: "Quien busque una experiencia temática fuerte o campañas narrativas.",
    minPlayers: 2,
    maxPlayers: 5,
    playtime: "35-45 min",
    age: "7+",
    complexity: "Ligera",
    categories: ["Familiar", "Colocación de losetas", "Clásicos modernos"],
    mechanics: ["Colocación de losetas", "Mayorías", "Control de áreas"],
    themes: ["Medieval", "Construcción"],
    similarGames: ["Catan", "Kingdomino", "Isle of Skye"],
    seoTitle: "Carcassonne: reseña, opinión y guía rápida",
    seoDescription:
      "Todo lo básico sobre Carcassonne: jugadores, duración, dificultad, pros, contras y alternativas.",
    faqs: [
      {
        question: "¿Carcassonne es bueno para dos jugadores?",
        answer:
          "Sí. A dos jugadores es más táctico y directo, con mucho control sobre el mapa."
      }
    ],
    sources: [{ label: "Datos aproximados de referencia editorial", url: "" }]
  },
  {
    name: "Arkham Horror LCG",
    slug: "arkham-horror-lcg",
    shortSummary:
      "Un juego de cartas cooperativo con campañas narrativas, construcción de mazos y decisiones duras.",
    description:
      "Arkham Horror LCG mezcla investigación, terror pulp y evolución de personajes mediante campañas. Cada escenario funciona como una misión con mapa de cartas, eventos y consecuencias que arrastran peso a la siguiente partida.",
    review:
      "Brilla cuando el grupo acepta que la historia puede torcerse. Es exigente en preparación y coste de expansiones, pero ofrece una de las experiencias narrativas más potentes del juego de mesa moderno.",
    pros: ["Narrativa emergente muy fuerte", "Mazos personalizables", "Campañas con consecuencias"],
    cons: ["Entrada económica elevada con expansiones", "Preparación más larga que un filler"],
    bestFor: "Jugadores cooperativos que disfrutan campañas, construcción de mazos y ambientación intensa.",
    notFor: "Quien quiera una caja cerrada y partidas rápidas sin mantenimiento.",
    minPlayers: 1,
    maxPlayers: 4,
    playtime: "60-120 min",
    age: "14+",
    complexity: "Media alta",
    categories: ["Cooperativo", "Cartas", "Campaña"],
    mechanics: ["Construcción de mazos", "Gestión de mano", "Campaña", "Prueba de habilidad"],
    themes: ["Terror", "Cthulhu", "Investigación"],
    similarGames: ["Marvel Champions", "El Señor de los Anillos LCG", "Mansiones de la Locura"],
    seoTitle: "Arkham Horror LCG: reseña, opinión y por dónde empezar",
    seoDescription:
      "Ficha de Arkham Horror LCG en español con resumen, duración, jugadores, dificultad, pros, contras y juegos parecidos.",
    faqs: [
      {
        question: "¿Arkham Horror LCG se puede jugar en solitario?",
        answer:
          "Sí. Funciona muy bien en solitario, aunque muchas personas prefieren controlar dos investigadores."
      }
    ],
    sources: [{ label: "Datos aproximados de referencia editorial", url: "" }]
  },
  {
    name: "Aventureros al Tren",
    slug: "aventureros-al-tren",
    shortSummary:
      "Colecciona cartas, completa rutas ferroviarias y pelea por los trayectos clave antes que tus rivales.",
    description:
      "Aventureros al Tren es una carrera por conectar ciudades mediante rutas de tren. Sus reglas son directas, pero cada turno plantea si conviene robar cartas, reclamar una ruta o asegurar billetes antes de que sea tarde.",
    review:
      "Es una recomendación casi infalible para mesa familiar. Tiene tensión, decisiones legibles y una producción visual que ayuda a vender la partida desde el primer turno.",
    pros: ["Muy fácil de enseñar", "Tensión constante por rutas", "Ideal para familias y nuevos jugadores"],
    cons: ["Puede sentirse repetitivo si se juega muy seguido", "El mapa se bloquea con fuerza a más jugadores"],
    bestFor: "Grupos familiares, nuevos jugadores y sesiones donde se quiere jugar rápido sin explicar demasiado.",
    notFor: "Jugadores que busquen combos profundos o mucha asimetría.",
    minPlayers: 2,
    maxPlayers: 5,
    playtime: "45-60 min",
    age: "8+",
    complexity: "Ligera",
    categories: ["Familiar", "Rutas", "Gateway"],
    mechanics: ["Colección de sets", "Construcción de rutas", "Objetivos secretos"],
    themes: ["Trenes", "Viajes"],
    similarGames: ["Catan", "Carcassonne", "Azul"],
    seoTitle: "Aventureros al Tren: reseña, duración y jugadores",
    seoDescription:
      "Reseña rápida de Aventureros al Tren: opinión, duración, jugadores, pros, contras y alternativas.",
    faqs: [
      {
        question: "¿Aventureros al Tren es buen juego familiar?",
        answer:
          "Sí. Es uno de los juegos familiares modernos más recomendables por claridad, ritmo y tensión."
      }
    ],
    sources: [{ label: "Datos aproximados de referencia editorial", url: "" }]
  },
  {
    name: "Descent: Leyendas de las Tinieblas",
    slug: "descent-leyendas-de-las-tinieblas",
    shortSummary:
      "Aventura cooperativa con app, miniaturas y escenarios vistosos para quienes quieren campaña fantástica.",
    description:
      "Descent: Leyendas de las Tinieblas apuesta por una experiencia cooperativa guiada por aplicación, con exploración, combate táctico y evolución de héroes a lo largo de una campaña.",
    review:
      "Es una propuesta espectacular en mesa y cómoda para jugar sin director de partida. Su dependencia de app y su tamaño lo colocan mejor en grupos que buscan una campaña grande.",
    pros: ["Producción muy vistosa", "La app agiliza enemigos y eventos", "Sensación clara de campaña"],
    cons: ["Ocupa bastante mesa", "No gustará a quien evite apps en juegos de mesa"],
    bestFor: "Grupos que quieren aventura cooperativa, miniaturas y campaña sin preparar un sistema rolero.",
    notFor: "Jugadores que prefieren eurogames secos o partidas cortas de una sesión.",
    minPlayers: 1,
    maxPlayers: 4,
    playtime: "120-180 min",
    age: "14+",
    complexity: "Media",
    categories: ["Aventura", "Cooperativo", "Campaña"],
    mechanics: ["App asistida", "Combate táctico", "Exploración", "Evolución de personajes"],
    themes: ["Fantasía", "Mazmorras", "Aventura"],
    similarGames: ["Gloomhaven", "Mansiones de la Locura", "Sword & Sorcery"],
    seoTitle: "Descent Leyendas de las Tinieblas: reseña y opinión",
    seoDescription:
      "Ficha de Descent Leyendas de las Tinieblas: duración, jugadores, dificultad, pros, contras y juegos parecidos.",
    faqs: [
      {
        question: "¿Descent Leyendas de las Tinieblas necesita app?",
        answer:
          "Sí. La aplicación forma parte del sistema y gestiona buena parte de la campaña."
      }
    ],
    sources: [{ label: "Datos aproximados de referencia editorial", url: "" }]
  }
];

async function main() {
  for (const game of games) {
    await prisma.game.upsert({
      where: { slug: game.slug },
      update: {
        ...game,
        imageUrl: heroImage,
        status: "published",
        createdByAi: false,
        publishedAt: new Date()
      },
      create: {
        ...game,
        imageUrl: heroImage,
        status: "published",
        createdByAi: false,
        publishedAt: new Date()
      }
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
