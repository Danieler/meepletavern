import { cache } from "react";
import { requireCurrentAppUser } from "@/lib/accountLibrary";

export const requireCurrentAppUserForRsc = cache(requireCurrentAppUser);
