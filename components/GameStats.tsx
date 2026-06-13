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
        <div key={stat.label} className="flex min-h-16 items-center gap-3 rounded-md border border-walnut/15 bg-white/75 px-3 py-2 shadow-soft">
          <BrandIcon name={stat.icon as BrandIconName} size={22} />
          <div className="min-w-0">
            <dt className="text-[10px] font-black uppercase tracking-[0.1em] text-walnut/55">{stat.label}</dt>
            <dd className="mt-0.5 text-base font-black leading-tight text-wood">{stat.value}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
}
