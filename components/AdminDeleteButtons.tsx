"use client";

import { Trash2 } from "lucide-react";
import { deleteCandidateAction } from "@/app/admin/candidates/[id]/actions";
import { deleteGameEditorAction } from "@/app/admin/games/[id]/actions";
import { useAdminI18n } from "@/lib/adminI18n";

export function DeleteGameButton({
  id,
  returnTo,
  published = false,
  gameName,
  compact = false
}: {
  id: string;
  returnTo: string;
  published?: boolean;
  gameName?: string;
  compact?: boolean;
}) {
  const { t, tFormat } = useAdminI18n();

  const confirmMessage = gameName
    ? published
      ? tFormat("games.confirmDeleteSinglePublished", { name: gameName })
      : tFormat("games.confirmDeleteSingle", { name: gameName })
    : published
    ? t("games.confirmBulkDeletePublished")
    : t("games.confirmBulkDelete");

  return (
    <form
      action={deleteGameEditorAction}
      onSubmit={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <button className={compact ? "button-danger min-h-9 px-3 py-1.5" : "button-danger"} type="submit">
        <Trash2 size={16} aria-hidden="true" />
        {t("common.delete")}
      </button>
    </form>
  );
}

export function DeleteCandidateButton({
  id,
  returnTo,
  compact = false
}: {
  id: string;
  returnTo: string;
  compact?: boolean;
}) {
  const { t } = useAdminI18n();

  return (
    <form
      action={deleteCandidateAction}
      onSubmit={(event) => {
        if (!window.confirm(t("games.confirmBulkDelete"))) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <button className={compact ? "button-danger min-h-9 px-3 py-1.5" : "button-danger"} type="submit">
        <Trash2 size={16} aria-hidden="true" />
        {t("common.delete")}
      </button>
    </form>
  );
}
