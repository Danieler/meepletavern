import "dotenv/config";
import { defineConfig } from "prisma/config";

const migrationUrl =
  process.env.MIGRATION_DATABASE_URL ||
  process.env.DIRECT_URL ||
  process.env.DATABASE_URL;

if (!migrationUrl) {
  throw new Error("Define MIGRATION_DATABASE_URL, DIRECT_URL o DATABASE_URL para usar Prisma CLI.");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts"
  },
  datasource: {
    url: migrationUrl
  }
});
