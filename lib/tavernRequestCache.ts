import { cache } from "react";
import { requireCurrentAppUserForRsc } from "@/lib/accountRequestCache";
import { getTavernGroupSummary } from "@/lib/tavernGroups";

export { requireCurrentAppUserForRsc };

export const getTavernGroupSummaryForRsc = cache(getTavernGroupSummary);
