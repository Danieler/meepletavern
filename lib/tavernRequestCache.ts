import { cache } from "react";
import { requireCurrentAppUserForRsc } from "@/lib/accountRequestCache";
import { getTavernGroupSummary } from "@/lib/tavernGroups";

export { requireCurrentAppUserForRsc };

export const getTavernGroupSummaryForRsc = cache((userId: string, tavernId: string) =>
  getTavernGroupSummary(userId, tavernId)
);
