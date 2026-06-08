export type AdminDatabaseError = {
  title: string;
  message: string;
  target: string | null;
};

export function getAdminDatabaseError(error: unknown): AdminDatabaseError | null {
  const message = error instanceof Error ? error.message : String(error);
  const isDatabaseError =
    message.includes("Can't reach database server") ||
    message.includes("Environment variable not found: DATABASE_URL") ||
    message.includes("Environment variable not found: DIRECT_URL") ||
    message.includes("PrismaClientInitializationError") ||
    message.includes("P1001");

  if (!isDatabaseError) {
    return null;
  }

  return {
    title: "El backoffice no puede conectar con la base de datos",
    message:
      "Las páginas públicas usan datos mock, pero el admin sigue usando Prisma. Necesita una PostgreSQL accesible en DATABASE_URL y DIRECT_URL.",
    target: getDatabaseTarget()
  };
}

function getDatabaseTarget() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return null;
  }

  try {
    const url = new URL(databaseUrl);
    return `${url.hostname}${url.port ? `:${url.port}` : ""}`;
  } catch {
    return "DATABASE_URL no tiene formato URL valido";
  }
}
