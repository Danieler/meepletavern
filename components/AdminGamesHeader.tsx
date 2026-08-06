"use client";

import { FilePlus2 } from "lucide-react";
import { AdminSectionHeader } from "@/components/AdminSectionHeader";
import { useAdminI18n } from "@/lib/adminI18n";

export function AdminGamesHeader({
  createManualGameAction
}: {
  createManualGameAction: () => Promise<void>;
}) {
  const { t } = useAdminI18n();

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <AdminSectionHeader
        titleKey="games.title"
        descriptionKey="games.description"
      />
      <form action={createManualGameAction}>
        <button className="button-secondary w-full sm:w-auto" type="submit">
          <FilePlus2 size={18} aria-hidden="true" />
          {t("games.newManualGame")}
        </button>
      </form>
    </div>
  );
}
