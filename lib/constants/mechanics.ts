import { CANONICAL_MECHANICS, normalizeMechanics } from "@/lib/taxonomy";

export const CURATED_MECHANICS_LIST = [...CANONICAL_MECHANICS];

export const MECHANIC_REMAPPINGS: { [key: string]: string } = {};

export function normalizeMechanicName(inputName: string): string | null {
  return normalizeMechanics([inputName])[0] || null;
}
