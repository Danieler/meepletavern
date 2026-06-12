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
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className="flex items-center gap-3 border-r border-walnut/15 p-3 last:border-r-0">
          <BrandIcon name={stat.icon as BrandIconName} size={30} />
          <div>
            <dt className="text-xs font-bold uppercase text-walnut/55">{stat.label}</dt>
            <dd className="text-lg font-black text-wood">{stat.value}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
}
