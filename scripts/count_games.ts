import { prisma } from "@/lib/prisma";

async function main() {
  const games = await prisma.game.findMany({
    where: {
      OR: [
        { title: { contains: "caza", mode: "insensitive" } },
        { title: { contains: "bomba", mode: "insensitive" } },
        { name: { contains: "caza", mode: "insensitive" } },
        { name: { contains: "bomba", mode: "insensitive" } },
      ]
    },
    select: {
      id: true,
      title: true,
      name: true,
      slug: true,
      status: true
    }
  });
  console.log("Matching games:", games);
}

main().catch(console.error).finally(() => prisma.$disconnect());
