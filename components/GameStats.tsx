import type { CatalogGame } from "@/lib/catalog";

const labels = {
  players: "Jugadores",
  best: "Mejor",
  duration: "Duración",
  age: "Edad",
  weight: "Peso"
};

export function GameStats({ game }: { game: CatalogGame }) {
  const stats = [
    { label: labels.players, value: game.playersLabel },
    { label: labels.duration, value: game.playtime },
    { label: labels.age, value: game.age },
    { label: labels.weight, value: game.complexity }
  ].filter((stat) => stat.value);

  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-md border border-ink/10 bg-white p-4 shadow-soft">
          <dt className="text-xs font-bold uppercase text-ink/45">{stat.label}</dt>
          <dd className="mt-1 text-lg font-black text-ink">{stat.value}</dd>
        </div>
      ))}
    </dl>
  );
}
