import { cache } from "react";
import { requireCurrentAppUserForTavernRsc } from "@/lib/accountLibrary";

export const requireCurrentAppUserForRsc = cache(requireCurrentAppUserForTavernRsc);
