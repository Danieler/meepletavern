"use client";

import { GameStatus } from "@prisma/client";
import { useAdminI18n } from "@/lib/adminI18n";

type AdminStatusBadgeProps = {
  status: GameStatus;
};

export function AdminStatusBadge({ status }: AdminStatusBadgeProps) {
  const { t } = useAdminI18n();

  const styles = {
    [GameStatus.draft]: "bg-ember/15 text-ink",
    [GameStatus.review]: "bg-ruby/10 text-ruby",
    [GameStatus.published]: "bg-moss/10 text-moss",
    [GameStatus.archived]: "bg-ink/10 text-ink/60"
  };

  const labels = {
    [GameStatus.draft]: t("status.draft"),
    [GameStatus.review]: t("status.review"),
    [GameStatus.published]: t("status.published"),
    [GameStatus.archived]: t("status.archived")
  };

  return (
    <span className={`inline-flex rounded-md px-2.5 py-1 text-xs font-bold ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
