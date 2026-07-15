"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Check, Crown, Dices, LibraryBig, Loader2, Plus, UsersRound, X } from "lucide-react";

type Dashboard = {
  taverns: Array<{
    id: string;
    name: string;
    role: "ADMIN" | "MEMBER";
    memberCount: number;
    playCount: number;
    uniqueGames: number;
  }>;
  invitations: Array<{
    id: string;
    expiresAt: string;
    tavern: { id: string; name: string; memberCount: number };
    invitedBy: { displayName: string; username: string } | null;
  }>;
};

export function TavernDashboardClient({ initialDashboard }: { initialDashboard: Dashboard }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [openingTavernId, setOpeningTavernId] = useState<string | null>(null);
  const [invitations, setInvitations] = useState(initialDashboard.invitations);
  const [error, setError] = useState("");

  async function createTavern(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/account/taverns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      });
      const payload = (await response.json().catch(() => null)) as { tavern?: { id: string }; error?: string } | null;
      if (!response.ok || !payload?.tavern) throw new Error(payload?.error || "No se pudo crear la taberna.");
      router.push(`/comunidad/tabernas/${payload.tavern.id}/miembros`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo crear la taberna.");
      setPending(false);
    }
  }

  async function respond(invitationId: string, action: "accept" | "decline") {
    setRespondingId(invitationId);
    setError("");
    try {
      const response = await fetch(`/api/account/tavern-invitations/${invitationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      const payload = (await response.json().catch(() => null)) as { accepted?: boolean; tavernId?: string; error?: string } | null;
      if (!response.ok) throw new Error(payload?.error || "No se pudo responder.");
      if (action === "accept" && payload?.tavernId) {
        router.push(`/comunidad/tabernas/${payload.tavernId}`);
      } else {
        setInvitations((current) => current.filter((invitation) => invitation.id !== invitationId));
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo responder.");
    } finally {
      setRespondingId(null);
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="tavern-eyebrow">Ludotecas de grupo</p>
        <h1 className="font-display mt-2 text-4xl font-bold text-wood sm:text-5xl">Mis tabernas</h1>
        <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-walnut/68">
          Crea un espacio privado para reunir los juegos que vuestro grupo tiene “En casa” y registrar las partidas que jugáis juntos.
        </p>
      </header>

      {error ? <p className="rounded-md border border-ruby/20 bg-ruby/8 px-4 py-3 text-sm font-bold text-ruby" role="alert">{error}</p> : null}

      {invitations.length ? (
        <section className="tavern-panel p-5 sm:p-6" aria-labelledby="pending-invitations-title">
          <p className="tavern-eyebrow">Te esperan</p>
          <h2 id="pending-invitations-title" className="font-display mt-2 text-3xl font-bold text-wood">Invitaciones pendientes</h2>
          <div className="mt-5 grid gap-3">
            {invitations.map((invitation) => (
              <article key={invitation.id} className="grid gap-4 rounded-md border border-walnut/12 bg-white/70 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div>
                  <h3 className="font-display text-xl font-bold text-wood">{invitation.tavern.name}</h3>
                  <p className="mt-1 text-sm font-semibold text-walnut/62">
                    {invitation.invitedBy ? `${invitation.invitedBy.displayName} te ha invitado` : "Te han invitado"} · {invitation.tavern.memberCount} miembros
                  </p>
                  <p className="mt-2 text-xs font-semibold leading-5 text-walnut/55">
                    Al aceptar, tus juegos marcados como “En casa” se compartirán únicamente con esta taberna.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button className="button-primary" disabled={respondingId === invitation.id} onClick={() => void respond(invitation.id, "accept")}>
                    <Check size={16} /> Aceptar
                  </button>
                  <button className="button-secondary" disabled={respondingId === invitation.id} onClick={() => void respond(invitation.id, "decline")} aria-label={`Rechazar invitación a ${invitation.tavern.name}`}>
                    <X size={16} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {!initialDashboard.taverns.length && !invitations.length ? renderCreateTavernPanel(true) : null}

      {initialDashboard.taverns.length ? (
        <section>
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="tavern-eyebrow">Tus grupos</p>
              <h2 className="font-display mt-2 text-3xl font-bold text-wood">Tabernas abiertas</h2>
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {initialDashboard.taverns.map((tavern) => {
              const isOpening = openingTavernId === tavern.id;

              return (
                <Link
                  key={tavern.id}
                  href={`/comunidad/tabernas/${tavern.id}`}
                  prefetch={false}
                  aria-busy={isOpening}
                  onClick={(event) => {
                    if (
                      event.defaultPrevented
                      || event.button !== 0
                      || event.metaKey
                      || event.ctrlKey
                      || event.shiftKey
                      || event.altKey
                    ) return;
                    setOpeningTavernId(tavern.id);
                  }}
                  className="tavern-card group p-5 transition hover:-translate-y-0.5 hover:border-ember/45"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.1em] text-ember">
                      {tavern.role === "ADMIN" ? <Crown size={15} /> : <UsersRound size={15} />}
                      {tavern.role === "ADMIN" ? "Administrador" : "Miembro"}
                    </span>
                    {isOpening ? (
                      <span className="inline-flex shrink-0 items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-walnut/55" role="status">
                        <Loader2 className="animate-spin motion-reduce:animate-none" size={14} aria-hidden="true" />
                        Abriendo
                      </span>
                    ) : null}
                  </div>
                  <h3 className="font-display mt-3 break-words text-2xl font-bold text-wood group-hover:text-ember">{tavern.name}</h3>
                  <div className="mt-5 grid grid-cols-3 gap-2 border-t border-walnut/10 pt-4 text-center">
                    <CardMetric icon={UsersRound} value={tavern.memberCount} label="Miembros" />
                    <CardMetric icon={LibraryBig} value={tavern.uniqueGames} label="Juegos" />
                    <CardMetric icon={Dices} value={tavern.playCount} label="Partidas" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      {initialDashboard.taverns.length || invitations.length ? renderCreateTavernPanel(false) : null}
    </div>
  );

  function renderCreateTavernPanel(firstTavern: boolean) {
    return (
      <section className="tavern-panel p-5 sm:p-6" aria-labelledby="create-tavern-title">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-ember/10 text-ember"><Plus size={20} /></span>
          <div>
            <p className="tavern-eyebrow">Crear grupo</p>
            <h2 id="create-tavern-title" className="font-display mt-1 text-2xl font-bold text-wood">
              {firstTavern ? "Crea tu primera taberna" : "Nueva taberna"}
            </h2>
          </div>
        </div>
        <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-walnut/62">
          Ponle un nombre reconocible. Después podrás invitar a tus compañeros; sus juegos no aparecerán hasta que acepten.
        </p>
        <form className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]" onSubmit={createTavern}>
          <label>
            <span className="field-label">Nombre de la taberna</span>
            <input className="field-input mt-2" required minLength={2} maxLength={60} value={name} onChange={(event) => setName(event.target.value)} placeholder="Los del jueves" />
          </label>
          <button className="button-primary self-end" disabled={pending} type="submit">
            {pending ? <Loader2 className="animate-spin" size={17} /> : <Plus size={17} />}
            {pending ? "Creando..." : "Crear taberna"}
          </button>
        </form>
      </section>
    );
  }
}

function CardMetric({ icon: Icon, value, label }: { icon: typeof UsersRound; value: number; label: string }) {
  return (
    <span>
      <Icon className="mx-auto text-walnut/45" size={16} />
      <strong className="font-display mt-1 block text-xl text-wood">{value}</strong>
      <small className="text-[9px] font-black uppercase tracking-wide text-walnut/45">{label}</small>
    </span>
  );
}
