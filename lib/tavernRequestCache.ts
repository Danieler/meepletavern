import { cache } from "react";
import { requireCurrentAppUser } from "@/lib/accountLibrary";
import { getTavernGroupSummary } from "@/lib/tavernGroups";

export const requireCurrentAppUserForRsc = cache(requireCurrentAppUser);

export const getTavernGroupSummaryForRsc = cache((userId: string, tavernId: string) =>
  getTavernGroupSummary(userId, tavernId)
);
