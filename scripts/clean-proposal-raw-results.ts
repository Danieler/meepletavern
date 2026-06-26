import { prisma } from "../lib/prisma";

async function main() {
  const count = await prisma.gameImportProposal.count();
  console.log(`Encontradas ${count} propuestas de importación en la base de datos.`);

  if (count === 0) {
    console.log("No hay propuestas para limpiar.");
    return;
  }

  const result = await prisma.gameImportProposal.updateMany({
    data: {
      rawSearchResults: []
    }
  });

  console.log(`Se han limpiado ${result.count} propuestas, vaciando 'rawSearchResults' a '[]'.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
