import type { CatalogGame } from "@/lib/catalog";
import { BrandIcon, type BrandIconName } from "@/components/BrandIcon";

const labels = {
  players: "Jugadores",
  best: "Mejor",
  duration: "Duración",
  age: "Edad",
  weight: "Peso"
};

export function GameStats({ game }: { game: CatalogGame }) {
  const stats = [
    { label: labels.players, value: game.playersLabel, icon: "users" },
    { label: labels.duration, value: game.playtime, icon: "clock" },
    { label: labels.age, value: game.age, icon: "calendar" },
    { label: labels.weight, value: game.complexity, icon: "gauge" }
  ].filter((stat) => stat.value);

  return (
    <dl className="grid grid-cols-2 gap-2 2xl:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className="flex min-h-16 min-w-0 items-center gap-3 rounded-md border border-walnut/10 bg-white/75 px-3 py-2 shadow-soft">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-ember/10 text-wood">
            <BrandIcon name={stat.icon as BrandIconName} size={20} />
          </span>
          <div className="min-w-0">
            <dt className="tavern-meta">{stat.label}</dt>
            <dd className="mt-0.5 truncate text-base font-extrabold leading-tight text-wood">{stat.value}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
}
