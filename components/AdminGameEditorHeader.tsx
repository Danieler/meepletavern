"use client";

import Link from "next/link";
import { ChevronLeft, SquarePen } from "lucide-react";
import { AdminSectionHeader } from "@/components/AdminSectionHeader";
import { useAdminI18n } from "@/lib/adminI18n";

export function AdminGameEditorHeader({
  gameId,
  gameTitle
}: {
  gameId: string;
  gameTitle: string;
}) {
  const { lang, t } = useAdminI18n();

  return (
    <div>
      <Link className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-moss" href="/admin/games">
        <ChevronLeft size={16} aria-hidden="true" />
        {t("gameForm.backToGames")}
      </Link>
      <AdminSectionHeader
        title={`${lang === "en" ? "Game Editor" : "Editor final"}: ${gameTitle}`}
        description={
          lang === "en"
            ? "Save drafts and publish only when editorial validation is complete."
            : "Guarda borradores y publica solo cuando la validación editorial esté completa."
        }
      />
      <div className="mb-6">
        <Link className="button-secondary" href={`/admin/reviews/new?gameId=${gameId}`}>
          <SquarePen size={18} aria-hidden="true" />
          {lang === "en" ? "Create review for this game" : "Crear reseña de este juego"}
        </Link>
      </div>
    </div>
  );
}
