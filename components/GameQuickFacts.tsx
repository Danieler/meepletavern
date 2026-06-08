import type { Game } from "@prisma/client";
import { Baby, Brain, Clock, Tags, Users } from "lucide-react";

type GameQuickFactsProps = {
  game: Game;
};

export function GameQuickFacts({ game }: GameQuickFactsProps) {
  const facts = [
    {
      label: "Jugadores",
      value: formatPlayers(game.minPlayers, game.maxPlayers),
      icon: Users
    },
    { label: "Duración", value: game.playtime, icon: Clock },
    { label: "Edad", value: game.age, icon: Baby },
    { label: "Complejidad", value: game.complexity, icon: Brain },
    { label: "Categorías", value: game.categories.join(", "), icon: Tags }
  ].filter((fact) => fact.value);

  return (
    <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {facts.map((fact) => {
        const Icon = fact.icon;
        return (
          <div key={fact.label} className="rounded-md border border-ink/10 bg-white p-4 shadow-soft">
            <dt className="flex items-center gap-2 text-xs font-bold uppercase text-ink/45">
              <Icon size={16} aria-hidden="true" />
              {fact.label}
            </dt>
            <dd className="mt-2 text-sm font-semibold leading-6 text-ink">{fact.value}</dd>
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
