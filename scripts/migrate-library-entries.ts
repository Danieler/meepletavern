import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Updating existing UserLibraryGame entries...");
  const result = await prisma.userLibraryGame.updateMany({
    where: {
      owned: false,
      wantToPlay: false,
      wantToBuy: false,
      played: false
    },
    data: {
      owned: true
    }
  });
  console.log(`Updated ${result.count} entries.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
