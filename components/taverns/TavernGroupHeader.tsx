import { Crown, Dices, LibraryBig, UsersRound } from "lucide-react";
import { TavernGroupNav } from "@/components/taverns/TavernGroupNav";

type Summary = {
  id: string;
  name: string;
  role: "ADMIN" | "MEMBER";
  memberCount: number;
  uniqueGames: number;
  playCount: number;
};

export function TavernGroupHeader({ tavern }: { tavern: Summary }) {
  return (
    <>
      <section className="relative overflow-hidden rounded-md border border-walnut/15 bg-wood text-white shadow-tavern">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(201,130,31,0.38),transparent_28rem),linear-gradient(135deg,rgba(54,32,22,0.98),rgba(31,31,31,0.96)_58%,rgba(47,79,111,0.48))]" />
        <div className="relative grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-ember">Taberna privada</p>
            <h1 className="font-display mt-2 break-words text-4xl font-bold leading-tight text-white sm:text-5xl">{tavern.name}</h1>
            <p className="mt-3 inline-flex items-center gap-2 text-sm font-extrabold text-parchment/72">
              {tavern.role === "ADMIN" ? <Crown size={16} aria-hidden="true" /> : <UsersRound size={16} aria-hidden="true" />}
              {tavern.role === "ADMIN" ? "Administrador" : "Miembro"}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <HeroMetric icon={UsersRound} label="Miembros" value={tavern.memberCount} />
            <HeroMetric icon={LibraryBig} label="Juegos" value={tavern.uniqueGames} />
            <HeroMetric icon={Dices} label="Partidas" value={tavern.playCount} />
          </div>
        </div>
      </section>
      <TavernGroupNav tavernId={tavern.id} isAdmin={tavern.role === "ADMIN"} />
    </>
  );
}

function HeroMetric({ icon: Icon, label, value }: { icon: typeof UsersRound; label: string; value: number }) {
  return (
    <div className="rounded-md border border-white/10 bg-black/15 p-3 backdrop-blur">
      <span className="flex items-center justify-between gap-2">
        <Icon size={17} className="text-ember" aria-hidden="true" />
        <strong className="font-display text-2xl text-white">{value}</strong>
      </span>
      <span className="mt-2 block text-[10px] font-black uppercase tracking-[0.12em] text-parchment/62">{label}</span>
    </div>
  );
}
