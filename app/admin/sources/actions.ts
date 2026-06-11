"use server";

import { revalidatePath } from "next/cache";
import { sourceRepository } from "@/lib/editorialRepositories";

export type SourceActionState = {
  error?: string;
  message?: string;
};

export async function createSourceAction(
  _state: SourceActionState,
  formData: FormData
): Promise<SourceActionState> {
  try {
    await sourceRepository.create(readSourceForm(formData));
    revalidatePath("/admin/sources");
    revalidatePath("/admin/import");
    return { message: "Fuente creada." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No se pudo crear la fuente." };
  }
}

export async function updateSourceAction(
  _state: SourceActionState,
  formData: FormData
): Promise<SourceActionState> {
  const id = stringValue(formData.get("id"));

  if (!id) {
    return { error: "Falta el identificador de la fuente." };
  }

  try {
    await sourceRepository.update(id, readSourceForm(formData));
    revalidatePath("/admin/sources");
    revalidatePath("/admin/import");
    revalidatePath("/admin/candidates");
    return { message: "Fuente actualizada." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No se pudo actualizar la fuente." };
  }
}

export async function deleteSourceAction(formData: FormData): Promise<void> {
  const id = stringValue(formData.get("id"));

  if (!id) {
    throw new Error("Falta el identificador de la fuente.");
  }

  await sourceRepository.delete(id);
  revalidatePath("/admin/sources");
  revalidatePath("/admin/import");
  revalidatePath("/admin/candidates");
}

function readSourceForm(formData: FormData) {
  return {
    name: formData.get("name"),
    baseUrl: formData.get("baseUrl")
  };
}

function stringValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}
