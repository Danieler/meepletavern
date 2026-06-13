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
    <dl className="grid grid-cols-2 gap-3 2xl:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-2xl border border-walnut/15 bg-white/75 p-4 shadow-soft">
          <BrandIcon name={stat.icon as BrandIconName} size={28} />
          <div>
            <dt className="mt-3 text-[11px] font-black uppercase tracking-[0.16em] text-walnut/55">{stat.label}</dt>
            <dd className="mt-1 text-lg font-black text-wood">{stat.value}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
}
