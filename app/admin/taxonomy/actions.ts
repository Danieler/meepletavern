"use server";

import { revalidatePath } from "next/cache";
import {
  createTaxonomyTerm,
  deleteTaxonomyTerm,
  isTaxonomyType,
  renameTaxonomyTerm,
  taxonomyErrorMessage,
  type TaxonomyTypeKey
} from "@/lib/taxonomy";

export type TaxonomyActionState = {
  error?: string;
  message?: string;
};

export async function createTaxonomyTermAction(
  _state: TaxonomyActionState,
  formData: FormData
): Promise<TaxonomyActionState> {
  const type = readTaxonomyType(formData);

  try {
    await createTaxonomyTerm(type, formData.get("name"));
    revalidateTaxonomy(type);
    return { message: "Término añadido." };
  } catch (error) {
    return { error: taxonomyErrorMessage(error) };
  }
}

export async function renameTaxonomyTermAction(
  _state: TaxonomyActionState,
  formData: FormData
): Promise<TaxonomyActionState> {
  const type = readTaxonomyType(formData);

  try {
    await renameTaxonomyTerm(formData.get("id"), formData.get("name"));
    revalidateTaxonomy(type);
    return { message: "Término renombrado." };
  } catch (error) {
    return { error: taxonomyErrorMessage(error) };
  }
}

export async function deleteTaxonomyTermAction(
  _state: TaxonomyActionState,
  formData: FormData
): Promise<TaxonomyActionState> {
  const type = readTaxonomyType(formData);

  try {
    await deleteTaxonomyTerm(formData.get("id"));
    revalidateTaxonomy(type);
    return { message: "Término eliminado." };
  } catch (error) {
    return { error: taxonomyErrorMessage(error) };
  }
}

function readTaxonomyType(formData: FormData): TaxonomyTypeKey {
  const value = formData.get("type");

  if (!isTaxonomyType(value)) {
    throw new Error("Tipo de taxonomía no válido.");
  }

  return value;
}

function revalidateTaxonomy(type: TaxonomyTypeKey) {
  revalidatePath("/juegos");
  revalidatePath("/categorias");
  revalidatePath("/mecanicas");
  revalidatePath("/tematicas");

  if (type === "category") {
    revalidatePath("/admin/categories");
  }

  if (type === "mechanic") {
    revalidatePath("/admin/mechanics");
  }

  if (type === "theme") {
    revalidatePath("/admin/tavern");
  }
}
