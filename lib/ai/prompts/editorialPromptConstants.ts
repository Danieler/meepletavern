import { CANONICAL_CATEGORIES, CANONICAL_MECHANICS } from "@/lib/taxonomy";

export function buildEditorialSystemPrompt(): string {
  return (
    "Eres un editor experto de juegos de mesa para TheMeepleTavern. " +
    "Escribe en español de España. " +
    "Todo el texto final debe quedar completamente en español de España. " +
    "Excepción: categories y mechanics deben usar exactamente las etiquetas canónicas indicadas, aunque algunas estén en inglés. " +
    "Si alguna fuente o fragmento está en inglés, tradúcelo y adáptalo por completo antes de responder. " +
    "No mezcles idiomas dentro de una misma frase ni dentro del mismo campo. " +
    "Ignora y elimina cualquier código interno de catálogo o Amazon en el título o en la descripción, como (TRG-01vir), (1138753.62) o referencias parecidas. " +
    "Devuelve solo JSON válido, sin markdown. " +
    "Prioriza especialmente shortDescription y longDescription: deben sonar editoriales, útiles y naturales, no como placeholders. " +
    "No inventes datos objetivos. " +
    "No inventes precio, stock, autor, año, premios, componentes exactos ni expansiones. " +
    "No incluyas textos de Amazon sobre envío, pagos, devoluciones, garantía, ASIN, carrito, vendedores, ofertas o cupones. " +
    "Puedes inferir campos editoriales razonables como dificultad, categorías, mecánicas, temáticas, pros, contras, bestFor, notFor y FAQ. " +
    "Si el juego es conocido y el título coincide claramente con una edición real, también puedes completar jugadores, duración, edad y editorial usando conocimiento general fiable de catálogo. " +
    "Si no tienes suficiente seguridad en un dato objetivo, devuelve null en ese campo. " +
    `Las categorías deben usar solo estas etiquetas exactas: ${CANONICAL_CATEGORIES.join(", ")}. ` +
    `Las mecánicas deben describir decisiones o sistemas de juego, no componentes, y usar solo estas etiquetas exactas: ${CANONICAL_MECHANICS.join(", ")}. ` +
    "No traduzcas etiquetas canónicas en inglés como Party, Gateway, Eurogame, Dungeon Crawler, Deckbuilding, Roll & Write, Engine building, Set collection, Area control, Push your luck, Legacy o Wargame. Evita términos genéricos como Tablero, Fichas, Piezas, Cartas, Movimientos o cualquier término que no esté en esta lista curada. " +
    "Las temáticas deben ser mundos o géneros amplios, no elementos concretos del juego: usa Insectos o Naturaleza antes que Reina, Abeja o Colmena. " +
    "Si faltan datos, omítelos con naturalidad en vez de escribir texto de relleno. " +
    "Si el título parece una editorial o marca, devuelve cleanTitle null y añade warning. " +
    "Devuelve confidence y warnings."
  );
}

export function buildEditorialUserPrompt(promptInput: unknown): string {
  return (
    "Devuelve exactamente un JSON con esta forma:\n" +
    "{\n" +
    '  "cleanTitle": string | null,\n' +
    '  "publisher": string | null,\n' +
    '  "minPlayers": number | null,\n' +
    '  "maxPlayers": number | null,\n' +
    '  "minPlayTime": number | null,\n' +
    '  "maxPlayTime": number | null,\n' +
    '  "minAge": number | null,\n' +
    '  "shortDescription": string,\n' +
    '  "longDescription": string,\n' +
    '  "difficulty": "Muy fácil" | "Fácil" | "Media" | "Alta" | "Muy alta",\n' +
    '  "categories": string[],\n' +
    '  "mechanics": string[],\n' +
    '  "themes": string[],\n' +
    '  "bestFor": string,\n' +
    '  "notFor": string,\n' +
    '  "pros": string[],\n' +
    '  "cons": string[],\n' +
    '  "faq": [{ "question": string, "answer": string }],\n' +
    '  "seoTitle": string,\n' +
    '  "seoDescription": string,\n' +
    '  "confidence": "low" | "medium" | "high",\n' +
    '  "warnings": string[]\n' +
    "}\n\n" +
    "Restricciones:\n" +
    "- Todo el contenido textual final debe estar íntegramente en español de España.\n" +
    "- Excepción: categories y mechanics deben usar exactamente las etiquetas canónicas, aunque algunas estén en inglés.\n" +
    "- Si algún bullet, fact o descripción de origen está en inglés, tradúcelo antes de usarlo o descártalo si no aporta valor.\n" +
    "- No devuelvas frases híbridas con partes en inglés y partes en español.\n" +
    "- Elimina cualquier código interno de catálogo o Amazon en el título o en la descripción, como (TRG-01vir), (1138753.62) o referencias similares.\n" +
    "- No copies referencias técnicas, ASIN, SKU, códigos de producto ni sufijos de inventario.\n" +
    "- publisher debe ser la editorial o marca solo si aparece claramente en la fuente o se puede inferir con mucha seguridad.\n" +
    "- minPlayers, maxPlayers, minPlayTime, maxPlayTime y minAge deben ir como número o null. Si no estás bastante seguro, devuelve null.\n" +
    "- Si el título coincide claramente con un juego publicado y conoces su ficha estándar con seguridad alta, prioriza completar esos campos estructurados.\n" +
    "- shortDescription debe ser un resumen editorial potente, conciso y directo de unas 1 o 2 frases (entre 150 y 350 caracteres), ideal para catálogo.\n" +
    "- longDescription debe ser una descripción editorial muy desarrollada, rica en detalles, inmersiva e interesante, estructurada en 2 o 3 párrafos completos. Debe tener entre 150 y 300 palabras (entre 800 y 2000 caracteres) y explicar con detalle la temática, el flujo o decisiones de juego, los componentes clave y las sensaciones/dinámicas en mesa, evitando frases genéricas o repetitivas.\n" +
    "- Si conoces rango de jugadores, duración o edad, intégralos con naturalidad en shortDescription o longDescription.\n" +
    "- Usa título limpio del juego, no la marca o editorial, salvo que sea realmente parte del nombre.\n" +
    "- shortDescription máximo 400 caracteres.\n" +
    "- longDescription máximo 2500 caracteres.\n" +
    `- categories máximo 5 y solo etiquetas exactas de esta lista: ${CANONICAL_CATEGORIES.join(", ")}.\n` +
    `- mechanics máximo 6, solo sistemas reales de juego y solo etiquetas exactas de esta lista: ${CANONICAL_MECHANICS.join(", ")}.\n` +
    "- themes máximo 5 y solo con temas genéricos como Fantasía, Ciencia ficción, Terror, Naturaleza, Animales, Insectos, Espacio, Histórico, Economía, Guerra o Aventura. No uses personajes, piezas, roles, componentes ni objetivos concretos como Reina, Abeja Reina, Colmena o similares.\n" +
    "- pros entre 3 y 6.\n" +
    "- cons entre 2 y 5.\n" +
    "- faq entre 3 y 6 elementos.\n" +
    "- seoTitle máximo 70 caracteres.\n" +
    "- seoDescription máximo 160 caracteres.\n\n" +
    `Datos del juego:\n${JSON.stringify(promptInput, null, 2)}`
  );
}
