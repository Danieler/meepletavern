import { GameStatus } from "@prisma/client";

type AdminStatusBadgeProps = {
  status: GameStatus;
};

export function AdminStatusBadge({ status }: AdminStatusBadgeProps) {
  const styles = {
    [GameStatus.draft]: "bg-ember/15 text-ink",
    [GameStatus.review]: "bg-ruby/10 text-ruby",
    [GameStatus.published]: "bg-moss/10 text-moss",
    [GameStatus.archived]: "bg-ink/10 text-ink/60"
  };

  const labels = {
    [GameStatus.draft]: "Borrador",
    [GameStatus.review]: "En revisión",
    [GameStatus.published]: "Publicado",
    [GameStatus.archived]: "Archivado"
  };

  return (
    <span className={`inline-flex rounded-md px-2.5 py-1 text-xs font-bold ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
