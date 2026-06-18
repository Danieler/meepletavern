// prisma/scripts/curate-mechanics.ts

import { PrismaClient, TaxonomyType } from "@prisma/client";
import { CURATED_MECHANICS_LIST, MECHANIC_REMAPPINGS, normalizeMechanicName } from "../../lib/constants/mechanics";
import { slugify } from "../../lib/slug"; // Assuming slugify is correctly exported and accessible

const prisma = new PrismaClient();

async function curateMechanics() {
  console.log("Starting mechanics curation process...");

  // 1. Fetch all existing mechanics from the database
  const existingMechanics = await prisma.taxonomyTerm.findMany({
    where: { type: TaxonomyType.mechanic },
  });

  const existingMechanicNames = new Set(existingMechanics.map((m) => m.name));
  const operations: Promise<any>[] = [];

  // 2. Process existing mechanics for remapping or removal
  for (const existingMechanic of existingMechanics) {
    const normalized = normalizeMechanicName(existingMechanic.name);

    if (normalized === null) {
      // Mechanic should be removed
      console.log(`Removing old mechanic term and its associations: "${existingMechanic.name}"`);
      operations.push(
        prisma.$transaction([
          prisma.$executeRaw`
            UPDATE "Game"
            SET "mechanics" = array_remove("mechanics", ${existingMechanic.name})
            WHERE ${existingMechanic.name} = ANY("mechanics")
          `,
          prisma.taxonomyTerm.delete({ where: { id: existingMechanic.id } }),
        ])
      );
    } else if (normalized !== existingMechanic.name) {
      // Mechanic should be remapped to a new (or existing) canonical name
      const targetSlug = slugify(normalized);
      if (!targetSlug) {
        console.error(`Skipping remapping of "${existingMechanic.name}" to "${normalized}" because slugify returned empty.`);
        continue;
      }

      const existingCanonicalTerm = await prisma.taxonomyTerm.findUnique({
        where: { type_slug: { type: TaxonomyType.mechanic, slug: targetSlug } },
      });

      if (existingCanonicalTerm) {
        // Scenario 2: Remapping to an already existing canonical term
        console.log(`Remapping games from "${existingMechanic.name}" to existing canonical: "${normalized}"`);
        operations.push(
          prisma.$transaction([
            prisma.$executeRaw`
              UPDATE "Game"
              SET "mechanics" = array_replace("mechanics", ${existingMechanic.name}, ${normalized})
              WHERE ${existingMechanic.name} = ANY("mechanics")
            `,
            prisma.taxonomyTerm.delete({ where: { id: existingMechanic.id } }),
          ])
        );
      } else {
        // Scenario 1: Remapping to a new canonical term (rename the existing term)
        console.log(`Renaming mechanic term from "${existingMechanic.name}" to "${normalized}"`);
        operations.push(
          prisma.$transaction([
            prisma.taxonomyTerm.update({
              where: { id: existingMechanic.id },
              data: { name: normalized, slug: targetSlug },
            }),
            prisma.$executeRaw`
              UPDATE "Game"
              SET "mechanics" = array_replace("mechanics", ${existingMechanic.name}, ${normalized})
              WHERE ${existingMechanic.name} = ANY("mechanics")
            `,
          ])
        );
      }
    } else {
      // Mechanic is already canonical and exists, ensure slug is correct
      const expectedSlug = slugify(existingMechanic.name);
      if (expectedSlug && existingMechanic.slug !== expectedSlug) {
        console.log(`Updating slug for existing canonical mechanic "${existingMechanic.name}" from "${existingMechanic.slug}" to "${expectedSlug}"`);
        operations.push(
          prisma.taxonomyTerm.update({
            where: { id: existingMechanic.id },
            data: { slug: expectedSlug },
          })
        );
      }
    }
  }

  // 3. Add any missing curated mechanics
  for (const curatedName of CURATED_MECHANICS_LIST) {
    if (!existingMechanicNames.has(curatedName)) {
      const slug = slugify(curatedName);
      if (!slug) {
        console.error(`Skipping creation of "${curatedName}" because slugify returned empty.`);
        continue;
      }

      const exists = await prisma.taxonomyTerm.findUnique({
        where: { type_slug: { type: TaxonomyType.mechanic, slug } },
      });

      if (!exists) {
        console.log(`Creating new curated mechanic: "${curatedName}"`);
        operations.push(
          prisma.taxonomyTerm.create({
            data: {
              type: TaxonomyType.mechanic,
              name: curatedName,
              slug: slug,
            },
          })
        );
      }
    }
  }

  // Execute all accumulated operations
  await Promise.all(operations);
  console.log("Mechanics curation process completed.");
}

curateMechanics()
  .catch((e) => {
    console.error("Error during mechanics curation:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
