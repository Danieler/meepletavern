import { Prisma, TaxonomyType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

export type TaxonomyTypeKey = `${TaxonomyType}`;

export type TaxonomyTermItem = {
  id: string;
  type: TaxonomyTypeKey;
  name: string;
  slug: string;
};

const taxonomyColumns = {
  category: Prisma.raw('"categories"'),
  mechanic: Prisma.raw('"mechanics"'),
  theme: Prisma.raw('"themes"')
} satisfies Record<TaxonomyTypeKey, Prisma.Sql>;

export function isTaxonomyType(value: unknown): value is TaxonomyTypeKey {
  return value === TaxonomyType.category || value === TaxonomyType.mechanic || value === TaxonomyType.theme;
}

export async function getAdminTaxonomyTerms(type: TaxonomyTypeKey) {
  return prisma.taxonomyTerm.findMany({
    where: { type },
    orderBy: [{ name: "asc" }]
  });
}

export async function getTaxonomyTermNames(type: TaxonomyTypeKey) {
  const terms = await prisma.taxonomyTerm.findMany({
    where: { type },
    orderBy: [{ name: "asc" }],
    select: { name: true }
  });

  return terms.map((term) => term.name);
}

export async function createTaxonomyTerm(type: TaxonomyTypeKey, rawName: unknown) {
  const name = normalizeTermName(rawName);
  const slug = normalizeTermSlug(name);

  return prisma.taxonomyTerm.create({
    data: {
      type,
      name,
      slug
    }
  });
}

export async function renameTaxonomyTerm(id: unknown, rawName: unknown) {
  const termId = normalizeTermId(id);
  const name = normalizeTermName(rawName);
  const slug = normalizeTermSlug(name);
  const existingTerm = await prisma.taxonomyTerm.findUnique({ where: { id: termId } });

  if (!existingTerm) {
    throw new Error("No existe ese término.");
  }

  if (existingTerm.name === name && existingTerm.slug === slug) {
    return existingTerm;
  }

  const column = taxonomyColumns[existingTerm.type];

  const [updatedTerm] = await prisma.$transaction([
    prisma.taxonomyTerm.update({
      where: { id: existingTerm.id },
      data: { name, slug }
    }),
    prisma.$executeRaw`
      UPDATE "Game"
      SET ${column} = array_replace(${column}, ${existingTerm.name}, ${name})
      WHERE ${existingTerm.name} = ANY(${column})
    `
  ]);

  return updatedTerm;
}

export async function deleteTaxonomyTerm(id: unknown) {
  const termId = normalizeTermId(id);
  const existingTerm = await prisma.taxonomyTerm.findUnique({ where: { id: termId } });

  if (!existingTerm) {
    throw new Error("No existe ese término.");
  }

  const column = taxonomyColumns[existingTerm.type];

  await prisma.$transaction([
    prisma.$executeRaw`
      UPDATE "Game"
      SET ${column} = array_remove(${column}, ${existingTerm.name})
      WHERE ${existingTerm.name} = ANY(${column})
    `,
    prisma.taxonomyTerm.delete({ where: { id: existingTerm.id } })
  ]);
}

export function taxonomyErrorMessage(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return "Ya existe un término con ese nombre.";
  }

  return error instanceof Error ? error.message : "No se pudo guardar el término.";
}

function normalizeTermId(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("Falta el identificador del término.");
  }

  return value.trim();
}

function normalizeTermName(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("El nombre del término es obligatorio.");
  }

  return value.trim().replace(/\s+/g, " ");
}

function normalizeTermSlug(name: string) {
  const slug = slugify(name);

  if (!slug) {
    throw new Error("El nombre no genera un slug válido.");
  }

  return slug;
}
