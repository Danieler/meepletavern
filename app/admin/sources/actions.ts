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

function readSourceForm(formData: FormData) {
  return {
    name: formData.get("name"),
    baseUrl: formData.get("baseUrl"),
    type: formData.get("type"),
    status: formData.get("status"),
    permissions: {
      canUseMetadata: formData.get("canUseMetadata") === "on",
      canUseImages: formData.get("canUseImages") === "on",
      canUseDescriptions: formData.get("canUseDescriptions") === "on",
      canUsePrices: formData.get("canUsePrices") === "on",
      canStoreImagesLocally: formData.get("canStoreImagesLocally") === "on"
    },
    attributionRequired: formData.get("attributionRequired") === "on",
    attributionText: formData.get("attributionText"),
    notes: formData.get("notes"),
    contactEmail: formData.get("contactEmail"),
    permissionProofUrl: formData.get("permissionProofUrl")
  };
}

function stringValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}
