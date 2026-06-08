export type BuyLink = {
  store: string;
  url: string;
  label?: string;
};

export type CatalogGame = {
  id: string;
  slug: string;
  title: string;
  originalTitle: string;
  year: number;
  image: string;
  rating: number;
  rank: number;
  popularity: number;
  playersMin: number;
  playersMax: number;
  bestPlayers: string;
  durationMin: number;
  durationMax: number;
  age: number;
  weight: number;
  publisher: string;
  designer: string;
  artists: string[];
  categories: string[];
  mechanics: string[];
  themes: string[];
  description: string;
  reviewSummary: string;
  pros: string[];
  cons: string[];
  recommendedFor: string;
  notRecommendedFor: string;
  similarGames: string[];
  buyLinks: BuyLink[];
  addedAt: string;
};

export type Review = {
  id: string;
  slug: string;
  title: string;
  gameSlug: string;
  rating: number;
  summary: string;
  body: string[];
  publishedAt: string;
  image: string;
};

export type Ranking = {
  slug: string;
  title: string;
  description: string;
  gameSlugs: string[];
};

export const catalogGames: CatalogGame[] = [
  {
    id: "game-catan",
    slug: "catan",
    title: "Catan",
    originalTitle: "Catan",
    year: 1995,
    image:
      "https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&w=1200&q=82",
    rating: 7.4,
    rank: 42,
    popularity: 96,
    playersMin: 3,
    playersMax: 4,
    bestPlayers: "4",
    durationMin: 60,
    durationMax: 90,
    age: 10,
    weight: 2.3,
    publisher: "Kosmos / Devir",
    designer: "Klaus Teuber",
    artists: ["Michael Menzel", "Volkan Baga"],
    categories: ["Familiar", "Estrategia", "Eurogame"],
    mechanics: ["Gestión de mano", "Dados", "Comercio", "Rutas"],
    themes: ["Colonización", "Medieval"],
    description:
      "Un clásico moderno de comercio y expansión donde cada partida cambia por el mapa modular, la negociación y la tensión por las rutas clave.",
    reviewSummary:
      "Catan sigue siendo una puerta de entrada muy sólida: social, fácil de enseñar y con suficiente fricción para que la mesa hable desde el primer turno.",
    pros: ["Negociación constante", "Tablero modular", "Entrada amable al hobby"],
    cons: ["El azar puede pesar", "Puede castigar a quien empieza mal"],
    recommendedFor: "Grupos que quieren interacción, comercio y una primera experiencia moderna.",
    notRecommendedFor: "Jugadores que buscan control absoluto o poca negociación.",
    similarGames: ["carcassonne", "aventureros-al-tren", "7-wonders-duel"],
    buyLinks: [{ store: "Buscar edición en español", url: "https://www.google.com/search?q=Catan+juego+de+mesa+espa%C3%B1ol" }],
    addedAt: "2026-01-04"
  },
  {
    id: "game-carcassonne",
    slug: "carcassonne",
    title: "Carcassonne",
    originalTitle: "Carcassonne",
    year: 2000,
    image:
      "https://images.unsplash.com/photo-1606503153255-59d8b8b82176?auto=format&fit=crop&w=1200&q=82",
    rating: 7.5,
    rank: 38,
    popularity: 93,
    playersMin: 2,
    playersMax: 5,
    bestPlayers: "2-3",
    durationMin: 35,
    durationMax: 45,
    age: 7,
    weight: 1.9,
    publisher: "Hans im Glück / Devir",
    designer: "Klaus-Jürgen Wrede",
    artists: ["Doris Matthäus", "Anne Pätzke"],
    categories: ["Familiar", "Abstracto", "Estrategia"],
    mechanics: ["Colocación de losetas", "Mayorías", "Control de áreas"],
    themes: ["Medieval"],
    description:
      "Construye una región compartida de ciudades, caminos y campos mientras decides cuándo puntuar y cuándo bloquear a tus rivales.",
    reviewSummary:
      "Pocas reglas, mucha lectura de mesa y una curva táctica que se abre partida a partida.",
    pros: ["Explicación rapidísima", "Funciona muy bien a dos", "Rejugable y visual"],
    cons: ["Los campos cuestan al principio", "Puede depender del robo de losetas"],
    recommendedFor: "Familias, parejas y grupos que quieren estrategia ligera con interacción visible.",
    notRecommendedFor: "Quien busque una historia fuerte o campañas largas.",
    similarGames: ["catan", "dixit", "wingspan"],
    buyLinks: [{ store: "Buscar edición en español", url: "https://www.google.com/search?q=Carcassonne+juego+de+mesa+espa%C3%B1ol" }],
    addedAt: "2026-01-09"
  },
  {
    id: "game-pandemic",
    slug: "pandemic",
    title: "Pandemic",
    originalTitle: "Pandemic",
    year: 2008,
    image:
      "https://images.unsplash.com/photo-1585504198199-20277593b94f?auto=format&fit=crop&w=1200&q=82",
    rating: 7.6,
    rank: 34,
    popularity: 91,
    playersMin: 2,
    playersMax: 4,
    bestPlayers: "4",
    durationMin: 45,
    durationMax: 60,
    age: 8,
    weight: 2.4,
    publisher: "Z-Man Games",
    designer: "Matt Leacock",
    artists: ["Chris Quilliams"],
    categories: ["Cooperativo", "Familiar", "Estrategia"],
    mechanics: ["Gestión de mano", "Acciones por turno", "Puntos de acción"],
    themes: ["Ciencia ficción", "Crisis global"],
    description:
      "Un cooperativo de tensión creciente en el que el grupo intenta contener brotes, descubrir curas y sobrevivir a un mazo que aprieta cada ronda.",
    reviewSummary:
      "Pandemic es una referencia para entender por qué los cooperativos funcionan: decisiones compartidas, urgencia y una derrota que casi siempre parece evitable.",
    pros: ["Tensión cooperativa", "Muy buen ritmo", "Objetivos claros"],
    cons: ["Puede sufrir efecto líder", "La presión no gusta a todas las mesas"],
    recommendedFor: "Grupos que quieren ganar o perder juntos y discutir cada movimiento.",
    notRecommendedFor: "Mesas donde una persona tiende a dirigir toda la partida.",
    similarGames: ["arkham-horror", "gloomhaven", "descent"],
    buyLinks: [{ store: "Buscar edición en español", url: "https://www.google.com/search?q=Pandemic+juego+de+mesa+espa%C3%B1ol" }],
    addedAt: "2026-01-14"
  },
  {
    id: "game-arkham-horror",
    slug: "arkham-horror",
    title: "Arkham Horror",
    originalTitle: "Arkham Horror",
    year: 2005,
    image:
      "https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&w=1200&q=82",
    rating: 7.8,
    rank: 28,
    popularity: 88,
    playersMin: 1,
    playersMax: 6,
    bestPlayers: "3-4",
    durationMin: 120,
    durationMax: 240,
    age: 14,
    weight: 3.4,
    publisher: "Fantasy Flight Games",
    designer: "Richard Launius, Kevin Wilson",
    artists: ["Anders Finér", "Tomasz Jedruszek"],
    categories: ["Cooperativo", "Narrativo", "Ameritrash"],
    mechanics: ["Dados", "Eventos", "Movimiento por tablero"],
    themes: ["Terror", "Cthulhu", "Pulp"],
    description:
      "Investigadores contra horrores cósmicos, localizaciones peligrosas y eventos que convierten cada partida en una historia caótica.",
    reviewSummary:
      "Una experiencia enorme y atmosférica, ideal si la mesa acepta reglas, azar y narrativa por encima de la eficiencia pura.",
    pros: ["Ambientación potente", "Historias memorables", "Gran presencia en mesa"],
    cons: ["Largo y aparatoso", "Azar alto"],
    recommendedFor: "Fans de Lovecraft, aventura y partidas con mucho relato emergente.",
    notRecommendedFor: "Quien quiera una experiencia corta o muy controlada.",
    similarGames: ["pandemic", "descent", "gloomhaven"],
    buyLinks: [{ store: "Buscar edición en español", url: "https://www.google.com/search?q=Arkham+Horror+juego+de+mesa+espa%C3%B1ol" }],
    addedAt: "2026-01-21"
  },
  {
    id: "game-gloomhaven",
    slug: "gloomhaven",
    title: "Gloomhaven",
    originalTitle: "Gloomhaven",
    year: 2017,
    image:
      "https://images.unsplash.com/photo-1606167668584-78701c57f13d?auto=format&fit=crop&w=1200&q=82",
    rating: 8.6,
    rank: 1,
    popularity: 86,
    playersMin: 1,
    playersMax: 4,
    bestPlayers: "3",
    durationMin: 60,
    durationMax: 120,
    age: 14,
    weight: 3.9,
    publisher: "Cephalofair Games",
    designer: "Isaac Childres",
    artists: ["Alexandr Elichev", "Josh T. McDowell"],
    categories: ["Dungeon crawler", "Cooperativo", "Estrategia"],
    mechanics: ["Campaña", "Gestión de mano", "Legacy", "Combate táctico"],
    themes: ["Fantasía", "Aventura"],
    description:
      "Campaña táctica de fantasía con progresión de personajes, escenarios enlazados y combate sin dados basado en cartas.",
    reviewSummary:
      "Gloomhaven es un compromiso grande, pero devuelve una profundidad táctica y de campaña difícil de igualar.",
    pros: ["Campaña gigantesca", "Combate táctico excelente", "Progresión adictiva"],
    cons: ["Preparación larga", "Mucho mantenimiento"],
    recommendedFor: "Grupos constantes que quieren una campaña táctica de largo recorrido.",
    notRecommendedFor: "Mesas que buscan partidas sueltas o reglas ligeras.",
    similarGames: ["descent", "heroquest", "arkham-horror"],
    buyLinks: [{ store: "Buscar edición en español", url: "https://www.google.com/search?q=Gloomhaven+juego+de+mesa+espa%C3%B1ol" }],
    addedAt: "2026-01-25"
  },
  {
    id: "game-wingspan",
    slug: "wingspan",
    title: "Wingspan",
    originalTitle: "Wingspan",
    year: 2019,
    image:
      "https://images.unsplash.com/photo-1522926193341-e9ffd686c60f?auto=format&fit=crop&w=1200&q=82",
    rating: 8.1,
    rank: 16,
    popularity: 89,
    playersMin: 1,
    playersMax: 5,
    bestPlayers: "3",
    durationMin: 40,
    durationMax: 70,
    age: 10,
    weight: 2.5,
    publisher: "Stonemaier Games / Maldito Games",
    designer: "Elizabeth Hargrave",
    artists: ["Natalia Rojas", "Ana María Martínez Jaramillo", "Beth Sobel"],
    categories: ["Familiar", "Estrategia", "Eurogame"],
    mechanics: ["Construcción de motores", "Draft", "Gestión de mano", "Dados"],
    themes: ["Naturaleza", "Animales"],
    description:
      "Un juego de motor de cartas donde cada ave activa hábitats, recursos y combos cada vez más eficientes.",
    reviewSummary:
      "Elegante, amable y con una producción deliciosa. Su estrategia crece desde pequeñas decisiones de eficiencia.",
    pros: ["Producción preciosa", "Motor satisfactorio", "Buen modo solitario"],
    cons: ["Interacción limitada", "El icono puede intimidar al principio"],
    recommendedFor: "Jugadores que disfrutan combos suaves y ritmo contemplativo.",
    notRecommendedFor: "Quien busque confrontación directa o negociación.",
    similarGames: ["terraforming-mars", "7-wonders-duel", "carcassonne"],
    buyLinks: [{ store: "Buscar edición en español", url: "https://www.google.com/search?q=Wingspan+juego+de+mesa+espa%C3%B1ol" }],
    addedAt: "2026-02-02"
  },
  {
    id: "game-terraforming-mars",
    slug: "terraforming-mars",
    title: "Terraforming Mars",
    originalTitle: "Terraforming Mars",
    year: 2016,
    image:
      "https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?auto=format&fit=crop&w=1200&q=82",
    rating: 8.3,
    rank: 5,
    popularity: 87,
    playersMin: 1,
    playersMax: 5,
    bestPlayers: "3",
    durationMin: 120,
    durationMax: 180,
    age: 12,
    weight: 3.3,
    publisher: "FryxGames / Maldito Games",
    designer: "Jacob Fryxelius",
    artists: ["Isaac Fryxelius"],
    categories: ["Estrategia", "Eurogame", "Ciencia ficción"],
    mechanics: ["Draft", "Construcción de motores", "Gestión de mano", "Control de áreas"],
    themes: ["Espacio", "Ciencia ficción"],
    description:
      "Corporaciones compiten por transformar Marte con proyectos, producción, hitos y una carrera constante por mejorar el planeta.",
    reviewSummary:
      "Un euro de motor expansivo, con cartas que cuentan pequeñas historias de ciencia ficción y muchas rutas estratégicas.",
    pros: ["Gran variedad de cartas", "Escala estratégica", "Tema muy integrado"],
    cons: ["Duración elevada", "Producción irregular según edición"],
    recommendedFor: "Jugadores que quieren motores largos, combos y decisiones de inversión.",
    notRecommendedFor: "Quien busque partidas rápidas o componentes de lujo.",
    similarGames: ["wingspan", "gloomhaven", "7-wonders-duel"],
    buyLinks: [{ store: "Buscar edición en español", url: "https://www.google.com/search?q=Terraforming+Mars+juego+de+mesa+espa%C3%B1ol" }],
    addedAt: "2026-02-08"
  },
  {
    id: "game-dixit",
    slug: "dixit",
    title: "Dixit",
    originalTitle: "Dixit",
    year: 2008,
    image:
      "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1200&q=82",
    rating: 7.2,
    rank: 63,
    popularity: 85,
    playersMin: 3,
    playersMax: 8,
    bestPlayers: "5-6",
    durationMin: 30,
    durationMax: 45,
    age: 8,
    weight: 1.2,
    publisher: "Libellud",
    designer: "Jean-Louis Roubira",
    artists: ["Marie Cardouat"],
    categories: ["Party", "Familiar", "Creativo"],
    mechanics: ["Votación", "Comunicación limitada", "Deducción"],
    themes: ["Fantasía", "Onírico"],
    description:
      "Un juego de pistas poéticas e imágenes sugerentes donde ganar depende de conectar con la mesa sin ser demasiado obvio.",
    reviewSummary:
      "Dixit convierte la imaginación compartida en mecánica. Es ligero, social y muy dependiente del grupo.",
    pros: ["Arte memorable", "Ideal para no jugones", "Muy social"],
    cons: ["Puede perder fuerza con grupos muy analíticos", "Poca estrategia dura"],
    recommendedFor: "Reuniones familiares, grupos creativos y mesas que quieren conversar.",
    notRecommendedFor: "Jugadores que buscan optimización o conflicto táctico.",
    similarGames: ["codenames", "carcassonne", "catan"],
    buyLinks: [{ store: "Buscar edición en español", url: "https://www.google.com/search?q=Dixit+juego+de+mesa+espa%C3%B1ol" }],
    addedAt: "2026-02-14"
  },
  {
    id: "game-codenames",
    slug: "codenames",
    title: "Codenames",
    originalTitle: "Codenames",
    year: 2015,
    image:
      "https://images.unsplash.com/photo-1523875194681-bedd468c58bf?auto=format&fit=crop&w=1200&q=82",
    rating: 7.7,
    rank: 31,
    popularity: 94,
    playersMin: 2,
    playersMax: 8,
    bestPlayers: "6-8",
    durationMin: 15,
    durationMax: 30,
    age: 10,
    weight: 1.3,
    publisher: "Czech Games Edition / Devir",
    designer: "Vlaada Chvátil",
    artists: ["Tomáš Kučerovský"],
    categories: ["Party", "Deducción", "Familiar"],
    mechanics: ["Comunicación limitada", "Equipos", "Deducción"],
    themes: ["Espías", "Pulp"],
    description:
      "Dos equipos interpretan pistas de una sola palabra para encontrar agentes secretos sin caer en el asesino.",
    reviewSummary:
      "Brilla por lo poco que necesita para generar tensión, risas y momentos de lectura mental entre amigos.",
    pros: ["Rápido y brillante", "Escala con grupos grandes", "Mucha rejugabilidad"],
    cons: ["Depende del idioma y del grupo", "Algunas rondas se atascan"],
    recommendedFor: "Grupos grandes que quieren un party inteligente sin montar una mesa enorme.",
    notRecommendedFor: "Quien prefiera partidas silenciosas o sin equipos.",
    similarGames: ["dixit", "catan", "carcassonne"],
    buyLinks: [{ store: "Buscar edición en español", url: "https://www.google.com/search?q=Codenames+juego+de+mesa+espa%C3%B1ol" }],
    addedAt: "2026-02-18"
  },
  {
    id: "game-7-wonders-duel",
    slug: "7-wonders-duel",
    title: "7 Wonders Duel",
    originalTitle: "7 Wonders Duel",
    year: 2015,
    image:
      "https://images.unsplash.com/photo-1600180758890-6b94519a8ba6?auto=format&fit=crop&w=1200&q=82",
    rating: 8.2,
    rank: 8,
    popularity: 90,
    playersMin: 2,
    playersMax: 2,
    bestPlayers: "2",
    durationMin: 30,
    durationMax: 45,
    age: 10,
    weight: 2.2,
    publisher: "Repos Production / Asmodee",
    designer: "Antoine Bauza, Bruno Cathala",
    artists: ["Miguel Coimbra"],
    categories: ["Estrategia", "Cartas", "Eurogame"],
    mechanics: ["Draft", "Colección de sets", "Mayorías", "Gestión de recursos"],
    themes: ["Civilización", "Antigüedad"],
    description:
      "Duelo de civilizaciones en tres eras, con ciencia, militar, maravillas y un draft tenso de cartas visibles.",
    reviewSummary:
      "Uno de los diseños para dos jugadores más redondos: corto, táctico y con varias condiciones de victoria que presionan a la vez.",
    pros: ["Excelente a dos", "Tensión constante", "Varias vías de victoria"],
    cons: ["Puede sentirse cruel", "La experiencia es solo para dos"],
    recommendedFor: "Parejas o dúos que quieren estrategia en menos de una hora.",
    notRecommendedFor: "Grupos de tres o más, o mesas que evitan confrontación directa.",
    similarGames: ["terraforming-mars", "wingspan", "catan"],
    buyLinks: [{ store: "Buscar edición en español", url: "https://www.google.com/search?q=7+Wonders+Duel+juego+de+mesa+espa%C3%B1ol" }],
    addedAt: "2026-02-22"
  },
  {
    id: "game-heroquest",
    slug: "heroquest",
    title: "HeroQuest",
    originalTitle: "HeroQuest",
    year: 1989,
    image:
      "https://images.unsplash.com/photo-1596495578065-6e0763fa1178?auto=format&fit=crop&w=1200&q=82",
    rating: 7.1,
    rank: 82,
    popularity: 83,
    playersMin: 2,
    playersMax: 5,
    bestPlayers: "4-5",
    durationMin: 60,
    durationMax: 90,
    age: 14,
    weight: 2.0,
    publisher: "Hasbro",
    designer: "Stephen Baker",
    artists: ["Les Edwards", "Gary Chalk"],
    categories: ["Dungeon crawler", "Ameritrash", "Aventura"],
    mechanics: ["Dados", "Movimiento por tablero", "Escenario"],
    themes: ["Fantasía", "Mazmorras"],
    description:
      "Aventura de mazmorras clásica con héroes, miniaturas, puertas, tesoros y un jugador que controla los peligros.",
    reviewSummary:
      "Más nostalgia y aventura que sistema moderno, pero todavía sabe vender una noche de exploración fantástica.",
    pros: ["Muy evocador", "Fácil de entender", "Miniaturas y mesa vistosa"],
    cons: ["Diseño clásico", "Necesita un jugador director"],
    recommendedFor: "Mesas que quieren aventura ligera con sabor de mazmorra tradicional.",
    notRecommendedFor: "Quien busque una campaña moderna y muy equilibrada.",
    similarGames: ["descent", "gloomhaven", "arkham-horror"],
    buyLinks: [{ store: "Buscar edición en español", url: "https://www.google.com/search?q=HeroQuest+juego+de+mesa+espa%C3%B1ol" }],
    addedAt: "2026-03-01"
  },
  {
    id: "game-descent",
    slug: "descent",
    title: "Descent",
    originalTitle: "Descent: Journeys in the Dark",
    year: 2005,
    image:
      "https://images.unsplash.com/photo-1577702312706-e23ff063064f?auto=format&fit=crop&w=1200&q=82",
    rating: 7.7,
    rank: 36,
    popularity: 84,
    playersMin: 2,
    playersMax: 5,
    bestPlayers: "4",
    durationMin: 120,
    durationMax: 180,
    age: 14,
    weight: 3.1,
    publisher: "Fantasy Flight Games",
    designer: "Kevin Wilson",
    artists: ["Jesper Ejsing", "John Goodenough"],
    categories: ["Dungeon crawler", "Aventura", "Ameritrash"],
    mechanics: ["Dados", "Campaña", "Movimiento por tablero", "Combate táctico"],
    themes: ["Fantasía", "Mazmorras"],
    description:
      "Exploración fantástica con héroes, monstruos, equipo y escenarios que mezclan táctica de combate con aventura de campaña.",
    reviewSummary:
      "Descent ofrece una fantasía directa y muy de mesa, más accesible que algunos dungeon crawlers modernos pero con cuerpo suficiente.",
    pros: ["Aventura clara", "Combate vistoso", "Buen puente hacia campañas"],
    cons: ["Montaje notable", "Puede alargarse"],
    recommendedFor: "Grupos que quieren mazmorras, miniaturas y progresión sin entrar en sistemas enormes.",
    notRecommendedFor: "Quien prefiera euros secos o fillers de 30 minutos.",
    similarGames: ["heroquest", "gloomhaven", "arkham-horror"],
    buyLinks: [{ store: "Buscar edición en español", url: "https://www.google.com/search?q=Descent+juego+de+mesa+espa%C3%B1ol" }],
    addedAt: "2026-03-06"
  }
];

export const reviews: Review[] = [
  {
    id: "review-gloomhaven-campana",
    slug: "gloomhaven-campana-tactica",
    title: "Gloomhaven: campaña táctica para grupos constantes",
    gameSlug: "gloomhaven",
    rating: 9.1,
    summary: "Una crónica sobre por qué Gloomhaven exige compromiso, pero recompensa cada sesión con decisiones duras.",
    body: [
      "Gloomhaven no entra en mesa como un juego casual. Entra como una campaña, una caja de herramientas tácticas y un pacto de continuidad entre jugadores.",
      "Su mayor virtud está en el combate con cartas: cada decisión tiene coste, ritmo y consecuencias. No hay dados que salven una mala lectura, pero sí margen para heroicidades.",
      "No es para todos, y esa honestidad le sienta bien. Si el grupo quiere una aventura larga, organizada y exigente, sigue siendo una referencia."
    ],
    publishedAt: "2026-03-12",
    image:
      "https://images.unsplash.com/photo-1606167668584-78701c57f13d?auto=format&fit=crop&w=1200&q=82"
  },
  {
    id: "review-wingspan-motor-amable",
    slug: "wingspan-motor-amable",
    title: "Wingspan: construir un motor sin levantar la voz",
    gameSlug: "wingspan",
    rating: 8.4,
    summary: "Una reseña para entender por qué Wingspan funciona tan bien como euro amable y vistoso.",
    body: [
      "Wingspan usa su tema con delicadeza: aves, hábitats y poderes encajan en un motor que crece sin prisas.",
      "La interacción no es su punto fuerte, pero tampoco lo pretende. Su placer está en mirar tu tablero y ver cómo cada decisión empieza a alimentar la siguiente.",
      "Como recomendación para mesas que quieren estrategia agradable y producción cuidada, mantiene mucho valor."
    ],
    publishedAt: "2026-03-09",
    image:
      "https://images.unsplash.com/photo-1522926193341-e9ffd686c60f?auto=format&fit=crop&w=1200&q=82"
  },
  {
    id: "review-codenames-party",
    slug: "codenames-party-inteligente",
    title: "Codenames: el party que sigue pareciendo magia",
    gameSlug: "codenames",
    rating: 8.0,
    summary: "Pocas reglas, mucha lectura de grupo y una tensión que aparece con una sola palabra.",
    body: [
      "Codenames es brillante porque reduce el juego social a un gesto mínimo: una pista y un número.",
      "El resto lo hace la mesa. Las conexiones, malentendidos y silencios largos son el juego.",
      "No todos los grupos entran con la misma facilidad, pero cuando funciona, funciona de forma casi instantánea."
    ],
    publishedAt: "2026-03-03",
    image:
      "https://images.unsplash.com/photo-1523875194681-bedd468c58bf?auto=format&fit=crop&w=1200&q=82"
  }
];

export const rankings: Ranking[] = [
  {
    slug: "top-juegos-de-mesa",
    title: "Top juegos de mesa",
    description: "Una selección general de juegos con gran valoración, popularidad y recorrido en mesa.",
    gameSlugs: ["gloomhaven", "terraforming-mars", "7-wonders-duel", "wingspan", "pandemic", "catan"]
  },
  {
    slug: "familiares",
    title: "Mejores juegos familiares",
    description: "Juegos accesibles, claros y recomendables para mesas mixtas o poco habituales.",
    gameSlugs: ["carcassonne", "catan", "wingspan", "dixit", "codenames"]
  },
  {
    slug: "dos-jugadores",
    title: "Mejores juegos para 2 jugadores",
    description: "Duelos y juegos que funcionan especialmente bien con dos personas.",
    gameSlugs: ["7-wonders-duel", "carcassonne", "wingspan", "terraforming-mars"]
  },
  {
    slug: "party",
    title: "Mejores juegos party",
    description: "Juegos para grupos, risas, conversación y reglas que no frenan la reunión.",
    gameSlugs: ["codenames", "dixit", "catan"]
  },
  {
    slug: "narrativos",
    title: "Mejores juegos narrativos",
    description: "Experiencias donde la partida se recuerda tanto por lo que ocurrió como por quién ganó.",
    gameSlugs: ["arkham-horror", "gloomhaven", "descent", "heroquest"]
  },
  {
    slug: "estrategia",
    title: "Mejores juegos de estrategia",
    description: "Juegos con decisiones de planificación, ritmo y lectura de largo plazo.",
    gameSlugs: ["terraforming-mars", "gloomhaven", "7-wonders-duel", "wingspan", "catan"]
  },
  {
    slug: "cooperativos",
    title: "Mejores juegos cooperativos",
    description: "Juegos para coordinarse, discutir planes y celebrar victorias compartidas.",
    gameSlugs: ["pandemic", "gloomhaven", "arkham-horror", "descent"]
  },
  {
    slug: "principiantes",
    title: "Mejores juegos para principiantes",
    description: "Puertas de entrada modernas para descubrir juegos de mesa sin abrumarse.",
    gameSlugs: ["carcassonne", "catan", "dixit", "codenames", "pandemic"]
  }
];

export const categoryTerms = [
  "Familiar",
  "Estrategia",
  "Party",
  "Cooperativo",
  "Narrativo",
  "Dungeon crawler",
  "Wargame",
  "Eurogame",
  "Ameritrash",
  "Abstracto",
  "Infantil"
];

export const mechanicTerms = [
  "Colocación de trabajadores",
  "Construcción de mazos",
  "Mayorías",
  "Gestión de mano",
  "Draft",
  "Dados",
  "Control de áreas",
  "Legacy",
  "Campaña",
  "Movimiento por tablero"
];

export const themeTerms = [
  "Fantasía",
  "Ciencia ficción",
  "Terror",
  "Cthulhu",
  "Vampiros",
  "Medieval",
  "Pulp",
  "Piratas",
  "Espacio",
  "Disney",
  "Marvel",
  "Zombies"
];

export function getGameBySlug(slug: string) {
  return catalogGames.find((game) => game.slug === slug);
}

export function getGamesBySlugs(slugs: string[]) {
  return slugs.map(getGameBySlug).filter(Boolean) as CatalogGame[];
}

export function getReviews() {
  return [...reviews].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export function getReviewBySlug(slug: string) {
  return reviews.find((review) => review.slug === slug);
}

export function getReviewGame(review: Review) {
  return getGameBySlug(review.gameSlug);
}

export function getRankingBySlug(slug: string) {
  return rankings.find((ranking) => ranking.slug === slug);
}

export function getRankingGames(ranking: Ranking) {
  return getGamesBySlugs(ranking.gameSlugs);
}

export function getPopularGames(limit = 6) {
  return [...catalogGames]
    .sort((a, b) => b.popularity - a.popularity || b.rating - a.rating)
    .slice(0, limit);
}

export function getBeginnerGames(limit = 5) {
  return catalogGames
    .filter((game) => game.weight <= 2.4 || game.categories.includes("Familiar"))
    .sort((a, b) => a.weight - b.weight || b.rating - a.rating)
    .slice(0, limit);
}

export function getNewGames(limit = 5) {
  return [...catalogGames].sort((a, b) => b.addedAt.localeCompare(a.addedAt)).slice(0, limit);
}

export function getRelatedGames(game: CatalogGame) {
  return getGamesBySlugs(game.similarGames).slice(0, 4);
}

export type GameFilterInput = {
  q?: string;
  players?: string;
  duration?: string;
  weight?: string;
  age?: string;
  category?: string;
  mechanic?: string;
  theme?: string;
  sort?: string;
};

export function filterGames(input: GameFilterInput) {
  const query = input.q?.trim().toLowerCase();
  const category = input.category?.trim();
  const mechanic = input.mechanic?.trim();
  const theme = input.theme?.trim();

  let games = catalogGames.filter((game) => {
    const matchesQuery = query
      ? [
          game.title,
          game.originalTitle,
          game.publisher,
          game.designer,
          ...game.categories,
          ...game.mechanics,
          ...game.themes
        ]
          .join(" ")
          .toLowerCase()
          .includes(query)
      : true;
    const matchesPlayers = input.players ? matchesPlayerFilter(game, input.players) : true;
    const matchesDuration = input.duration ? matchesDurationFilter(game, input.duration) : true;
    const matchesWeight = input.weight ? matchesWeightFilter(game, input.weight) : true;
    const matchesAge = input.age ? game.age <= Number(input.age) : true;

    return (
      matchesQuery &&
      matchesPlayers &&
      matchesDuration &&
      matchesWeight &&
      matchesAge &&
      (!category || game.categories.includes(category)) &&
      (!mechanic || game.mechanics.includes(mechanic)) &&
      (!theme || game.themes.includes(theme))
    );
  });

  games = sortGames(games, input.sort);
  return games;
}

export function sortGames(games: CatalogGame[], sort = "rating") {
  const sorted = [...games];

  if (sort === "popularidad") {
    return sorted.sort((a, b) => b.popularity - a.popularity);
  }

  if (sort === "fecha") {
    return sorted.sort((a, b) => b.addedAt.localeCompare(a.addedAt));
  }

  if (sort === "dificultad") {
    return sorted.sort((a, b) => b.weight - a.weight);
  }

  return sorted.sort((a, b) => b.rating - a.rating || a.rank - b.rank);
}

export function termHref(type: "category" | "mechanic" | "theme", term: string) {
  const key = type === "category" ? "category" : type === "mechanic" ? "mechanic" : "theme";
  return `/juegos?${key}=${encodeURIComponent(term)}`;
}

function matchesPlayerFilter(game: CatalogGame, players: string) {
  const value = Number(players);

  if (!Number.isFinite(value)) {
    return true;
  }

  return game.playersMin <= value && game.playersMax >= value;
}

function matchesDurationFilter(game: CatalogGame, duration: string) {
  if (duration === "30") {
    return game.durationMax <= 30;
  }

  if (duration === "60") {
    return game.durationMax <= 60;
  }

  if (duration === "120") {
    return game.durationMax <= 120;
  }

  return game.durationMax > 120;
}

function matchesWeightFilter(game: CatalogGame, weight: string) {
  if (weight === "ligero") {
    return game.weight < 2;
  }

  if (weight === "medio") {
    return game.weight >= 2 && game.weight < 3;
  }

  return game.weight >= 3;
}
