import { prisma } from "../lib/prisma";
import { slugify } from "../lib/slug";

async function main() {
  const newMechanics = [
    "Movimiento en cuadrícula",
    "Tablero modular",
    "Escenarios/Misiones",
    "Progresión de personaje"
  ];

  for (const name of newMechanics) {
    const slug = slugify(name);
    await prisma.taxonomyTerm.upsert({
      where: {
        type_slug: {
          type: "mechanic",
          slug
        }
      },
      update: {},
      create: {
        type: "mechanic",
        name,
        slug
      }
    });
    console.log(`Mecánica '${name}' registrada/actualizada en la base de datos.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
