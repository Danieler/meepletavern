export type AdminOperation =
  | "candidate_conversion"
  | "game_save"
  | "game_publish";

export type AdminErrorPresentation = {
  message: string;
  details: string[];
  reference: string;
};

type ErrorLike = {
  code?: unknown;
  message?: unknown;
  meta?: {
    target?: unknown;
  };
  name?: unknown;
};

export function presentAdminOperationError(
  error: unknown,
  operation: AdminOperation,
  reference: string
): AdminErrorPresentation {
  const errorLike = toErrorLike(error);
  const code = typeof errorLike.code === "string" ? errorLike.code : "";
  const message = typeof errorLike.message === "string" ? errorLike.message.trim() : "";
  const target = normalizeConstraintTarget(errorLike.meta?.target);

  if (code === "P2002") {
    if (target.some((field) => field === "slug")) {
      return result(
        "Ya existe otra ficha con el mismo identificador URL.",
        ["Cambia el campo «Identificador URL» por uno distinto y vuelve a guardar."],
        reference
      );
    }

    if (target.some((field) => field === "title" || field === "name")) {
      return result(
        "Ya existe otra ficha con el mismo título.",
        ["Busca el juego en Fichas antes de crear uno nuevo o diferencia claramente la edición."],
        reference
      );
    }

    return result(
      "Ya existe una ficha que usa alguno de estos datos únicos.",
      ["Comprueba el título y el identificador URL antes de volver a intentarlo."],
      reference
    );
  }

  if (code === "P2025" || message === "No existe ese juego." || message === "No existe ese candidato.") {
    return result(
      operation === "candidate_conversion"
        ? "El candidato ya no existe o fue procesado en otra pestaña."
        : "La ficha ya no existe o fue modificada en otra pestaña.",
      ["Vuelve al listado, recarga la página y comprueba su estado actual."],
      reference
    );
  }

  if (message === "El candidato ya está convertido.") {
    return result(
      "Este candidato ya tiene una ficha creada.",
      ["Vuelve al listado de candidatos y abre la ficha enlazada."],
      reference
    );
  }

  if (code === "P2003") {
    return result(
      "Falta un dato relacionado que la ficha necesita para guardarse.",
      ["Recarga la página y revisa la fuente, el candidato y las imágenes enlazadas."],
      reference
    );
  }

  if (isDatabaseUnavailable(code, message, errorLike.name)) {
    return result(
      "No se pudo conectar con la base de datos.",
      ["No se ha completado la operación. Espera unos segundos, recarga y vuelve a intentarlo."],
      reference
    );
  }

  if (code === "P2000") {
    return result(
      "Uno de los textos es demasiado largo para guardarlo.",
      ["Reduce los campos de texto más extensos, especialmente descripción, SEO, pros, contras o FAQ."],
      reference
    );
  }

  if (code === "P2011" || code === "P2012" || code === "P2013") {
    return result(
      "Falta un dato obligatorio para guardar la ficha.",
      ["Revisa el título y el identificador URL. Si intentas publicar, completa también los campos señalados en «Preparación para publicar»."],
      reference
    );
  }

  if (/falta el identificador|es obligatorio|no es v[aá]lid[oa]/i.test(message)) {
    return result(message, [operationHint(operation)], reference);
  }

  if (/timed out|timeout|aborted/i.test(message)) {
    return result(
      "La operación tardó demasiado y se interrumpió.",
      ["Los datos no se han publicado. Recarga la ficha y vuelve a intentarlo una sola vez."],
      reference
    );
  }

  return result(
    fallbackMessage(operation),
    [operationHint(operation), `Si vuelve a ocurrir, busca la referencia ${reference} en el registro del servidor.`],
    reference
  );
}

export function formatImportError(error: unknown) {
  const errorLike = toErrorLike(error);
  const message = typeof errorLike.message === "string" ? errorLike.message.trim() : "";
  const code = typeof errorLike.code === "string" ? errorLike.code : "";

  if (isDatabaseUnavailable(code, message, errorLike.name)) {
    return "No se pudo guardar la importación porque la base de datos no está disponible. Comprueba la conexión y vuelve a intentarlo.";
  }

  if (/selecciona una fuente|no existe esa fuente/i.test(message)) {
    return "La fuente seleccionada ya no existe o no está disponible. Recarga la página y selecciona otra fuente.";
  }

  if (/introduce un asin v[aá]lido/i.test(message)) {
    return "El ASIN o la URL de Amazon no tienen un formato válido. Usa un ASIN de 10 caracteres o una URL de producto de Amazon.";
  }

  if (/la url del juego no es v[aá]lida|escribe la url|pega una url/i.test(message)) {
    return "La URL del juego no es válida. Copia la dirección completa de la ficha, empezando por https://.";
  }

  if (/la url no pertenece a la fuente/i.test(message)) {
    return `${stripUnsafeDetail(message)} Selecciona la tienda correcta en el desplegable o pega una URL de esa misma tienda.`;
  }

  if (/no hay fuentes configuradas/i.test(message)) {
    return "No hay tiendas configuradas para importar. Añade o activa al menos una fuente en Administración > Fuentes.";
  }

  if (/no se pudo detectar una fuente compatible/i.test(message)) {
    return "No reconocemos la tienda de esa URL. Usa una de las fuentes configuradas o importa el juego por título.";
  }

  if (/no se encontr[oó].*(coincidencia|resultado)|no match|ninguna coincidencia/i.test(message)) {
    return "No se encontró una ficha que coincida con ese juego. Revisa el nombre, añade la edición si es necesario o prueba con una URL directa.";
  }

  if (/no corresponde al t[ií]tulo|t[ií]tulo.*no coincide/i.test(message)) {
    return "La tienda devolvió un producto distinto del juego solicitado. No se creó el candidato para evitar importar una ficha equivocada; prueba con una URL directa del juego.";
  }

  const status = httpStatusFromMessage(message);
  if (status === 401 || status === 403) {
    return "La tienda rechazó el acceso automático a esa ficha. Comprueba que la URL abre en el navegador o prueba otra tienda compatible.";
  }

  if (status === 404) {
    return "La tienda no encontró esa ficha. Comprueba que la URL no esté caducada o busca el juego en otra tienda.";
  }

  if (status === 429) {
    return "La tienda ha limitado temporalmente las consultas. Espera unos minutos antes de volver a intentarlo.";
  }

  if (status && status >= 500) {
    return `La tienda respondió con un error temporal (${status}). No se pudo leer la ficha; prueba más tarde o usa otra fuente.`;
  }

  if (/timed out|timeout|aborted/i.test(message)) {
    return "La tienda tardó demasiado en responder. No se completó la importación; prueba otra URL o vuelve a intentarlo más tarde.";
  }

  if (/fetch failed|network|econn|enotfound|no se pudo acceder|no se pudo ejecutar la b[uú]squeda/i.test(message)) {
    return "No se pudo conectar con la tienda. Comprueba que la URL funciona y que el servidor tiene acceso a Internet.";
  }

  if (/bloqueado:/i.test(message)) {
    return `${stripUnsafeDetail(message)} Revisa la configuración del importador antes de volver a ejecutarlo.`;
  }

  if (isSafeInputMessage(message)) {
    return stripUnsafeDetail(message);
  }

  return "No se pudo completar la importación. Comprueba el nombre o la URL, revisa los fallos por fuente y vuelve a intentarlo con una sola entrada.";
}

export function safeAdminErrorLog(error: unknown) {
  const errorLike = toErrorLike(error);
  return {
    name: typeof errorLike.name === "string" ? errorLike.name.slice(0, 80) : "UnknownError",
    code: typeof errorLike.code === "string" ? errorLike.code.slice(0, 40) : undefined,
    message:
      typeof errorLike.message === "string"
        ? stripUnsafeDetail(errorLike.message).slice(0, 500)
        : "Error desconocido"
  };
}

function result(message: string, details: string[], reference: string): AdminErrorPresentation {
  return { message, details, reference };
}

function fallbackMessage(operation: AdminOperation) {
  if (operation === "candidate_conversion") {
    return "No se pudo crear la ficha desde este candidato.";
  }

  if (operation === "game_publish") {
    return "No se pudo completar la publicación y la ficha no se ha marcado como publicada.";
  }

  return "No se pudieron guardar los cambios de la ficha.";
}

function operationHint(operation: AdminOperation) {
  if (operation === "candidate_conversion") {
    return "Revisa los indicadores del candidato y comprueba que no exista ya una ficha del mismo juego.";
  }

  if (operation === "game_publish") {
    return "Recarga para comprobar si los cambios quedaron guardados en revisión, corrige los campos marcados y vuelve a pulsar Publicar.";
  }

  return "Recarga la ficha, revisa los campos editados y vuelve a guardar.";
}

function toErrorLike(error: unknown): ErrorLike {
  return error && typeof error === "object" ? error as ErrorLike : {};
}

function normalizeConstraintTarget(target: unknown) {
  const values = Array.isArray(target) ? target : typeof target === "string" ? [target] : [];
  return values
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.replace(/[\"'`()]/g, "").trim().toLowerCase());
}

function isDatabaseUnavailable(code: string, message: string, name: unknown) {
  return code === "P1001" ||
    code === "P1002" ||
    /can't reach database server|database server.*unreachable|prismaclientinitializationerror|environment variable not found: (database_url|direct_url)/i.test(message) ||
    name === "PrismaClientInitializationError";
}

function httpStatusFromMessage(message: string) {
  const match = message.match(/(?:devolvi[oó]|respond(?:i[oó]|ed with)|http|status|ficha original)\D{0,12}(\d{3})/i);
  return match ? Number(match[1]) : null;
}

function isSafeInputMessage(message: string) {
  return /^(falta|selecciona|escribe|introduce|la url|no existe|no hay|no se encontr[oó]|el lote|el cuerpo)/i.test(message);
}

function stripUnsafeDetail(message: string) {
  return message
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [oculto]")
    .replace(/\b(?:tvly-[A-Za-z0-9_-]+|AKIA[A-Z0-9]{16})\b/g, "[credencial oculta]")
    .replace(/([?&](?:key|token|api_key|apikey|secret)=)[^\s&#]+/gi, "$1[oculto]")
    .replace(/\s+/g, " ")
    .trim();
}
