// lib/constants/mechanics.ts

export const CURATED_MECHANICS_LIST = [
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
  "Wargame",
];

// Mappings from old/variant mechanic names to the curated list.
// If a value is an empty string, it means the mechanic should be removed (not remapped).
export const MECHANIC_REMAPPINGS: { [key: string]: string } = {
  "Construcción de mazos": "Deckbuilding",
  "Construcción de motor": "Engine building",
  "Colección de sets": "Set collection",
  "Control de areas": "Area control", // Common variant
  "Deducción social": "Deducción",
  "Colocación de piezas": "Colocación de losetas", // Common interpretation, assuming for now
  "Movimiento": "", // Too generic, remove
  "Bloqueo": "", // Too generic, remove
  "Dados": "Combate con dados", // Best fit, specific use case
  "Mecánicas de dados": "Combate con dados", // More specific variant
  "Votación": "Mayorías",
  "Eliminación de jugadores": "Roles ocultos", // Often related to social deduction or hidden roles
  "Moderador": "Roles ocultos", // Moderator is a role in hidden role games
  "Interacción": "Negociación", // Generic, but negotiation implies interaction.
  "Accesible": "", // Not a game mechanic, remove
  "Juego de guerra": "Wargame", // Spanish translation
  "Empujar tu suerte": "Push your luck", // Spanish translation
  "Construcción de conjunto": "Set collection", // another variant
  "Control de area": "Area control", // common typo or variant
  "Gestión de mano de cartas": "Gestión de mano", // variant
  "Simultáneo": "", // too generic
  "Programación de acciones": "Gestión de mano", // Can be related to card management or worker placement
  "Puntos de acción": "Gestión de recursos", // Points are resources
  "Subastas": "Negociación", // Subastas implies negotiation
};

// Function to normalize a mechanic name to its curated equivalent
export function normalizeMechanicName(inputName: string): string | null {
  const normalizedInput = inputName.trim();

  // Check direct remappings first
  if (MECHANIC_REMAPPINGS[normalizedInput] !== undefined) {
    const remapped = MECHANIC_REMAPPINGS[normalizedInput];
    return remapped === "" ? null : remapped; // If remapped to "", means remove
  }

  // Check if it's already in the curated list
  if (CURATED_MECHANICS_LIST.includes(normalizedInput)) {
    return normalizedInput;
  }

  // If not found and not remapped, discard
  return null;
}
