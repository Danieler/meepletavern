import type { Game } from "@prisma/client";
import { BrandIcon, type BrandIconName } from "@/components/BrandIcon";

type GameQuickFactsProps = {
  game: Game;
};

export function GameQuickFacts({ game }: GameQuickFactsProps) {
  const facts = [
    {
      label: "Jugadores",
      value: formatPlayers(game.minPlayers, game.maxPlayers),
      icon: "users"
    },
    { label: "Duración", value: game.playtime, icon: "clock" },
    { label: "Edad", value: game.age, icon: "calendar" },
    { label: "Complejidad", value: game.complexity, icon: "gauge" },
    { label: "Categorías", value: game.categories.join(", "), icon: "tag" }
  ].filter((fact) => fact.value);

  return (
    <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {facts.map((fact) => {
        return (
          <div key={fact.label} className="surface-muted p-4 shadow-soft">
            <dt className="tavern-meta flex items-center gap-2">
              <BrandIcon name={fact.icon as BrandIconName} size={16} />
              {fact.label}
            </dt>
            <dd className="mt-2 text-sm font-bold leading-6 text-ink">{fact.value}</dd>
          </div>
        );
      })}
    </dl>
  );
}

function formatPlayers(minPlayers: number | null, maxPlayers: number | null) {
  if (!minPlayers && !maxPlayers) {
    return null;
  }

  if (minPlayers && maxPlayers && minPlayers !== maxPlayers) {
    return `${minPlayers}-${maxPlayers}`;
  }

  return `${minPlayers || maxPlayers}`;
}
