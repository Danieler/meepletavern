"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useMemo, useState } from "react";
import { CalendarDays, Dices, Loader2, Trash2, UserRound, UsersRound } from "lucide-react";

type Person = { id: string; username: string; displayName: string };
type LibraryGame = { gameId: string; title: string; copyCount: number };
type Member = { user: Person };
type Play = {
  id: string;
  title: string;
  slug: string | null;
  playedAt: string;
  recordedBy: Person | null;
  canDelete: boolean;
  participants: Person[];
};

export function TavernPlaysClient({
  tavernId,
  currentUserId,
  games,
  members,
  initialPlays,
  initialGameId
}: {
  tavernId: string;
  currentUserId: string;
  games: LibraryGame[];
  members: Member[];
  initialPlays: Play[];
  initialGameId?: string;
}) {
  const router = useRouter();
  const validInitialGame = games.some((game) => game.gameId === initialGameId) ? initialGameId || "" : games[0]?.gameId || "";
  const [gameId, setGameId] = useState(validInitialGame);
  const [playedAt, setPlayedAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [participants, setParticipants] = useState<string[]>(() => members.some((member) => member.user.id === currentUserId) ? [currentUserId] : []);
  const [pending, setPending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const sortedMembers = useMemo(() => [...members].sort((a, b) => a.user.displayName.localeCompare(b.user.displayName, "es")), [members]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setFeedback(null);
    try {
      const response = await fetch(`/api/account/taverns/${tavernId}/plays`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId, playedAt, participantUserIds: participants })
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error || "No se pudo registrar la partida.");
      setFeedback({ tone: "success", text: "Partida registrada solo para esta taberna." });
      router.refresh();
    } catch (caught) {
      setFeedback({ tone: "error", text: caught instanceof Error ? caught.message : "No se pudo registrar la partida." });
    } finally {
      setPending(false);
    }
  }

  async function remove(playId: string) {
    if (!window.confirm("¿Eliminar esta partida de la taberna?")) return;
    setDeletingId(playId);
    setFeedback(null);
    try {
      const response = await fetch(`/api/account/taverns/${tavernId}/plays/${playId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: "{}"
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error || "No se pudo eliminar la partida.");
      router.refresh();
    } catch (caught) {
      setFeedback({ tone: "error", text: caught instanceof Error ? caught.message : "No se pudo eliminar la partida." });
    } finally {
      setDeletingId(null);
    }
  }

  function toggleParticipant(userId: string) {
    setParticipants((current) => current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]);
  }

  return (
    <div className="grid gap-7 xl:grid-cols-[380px_minmax(0,1fr)] xl:items-start">
      <section className="tavern-panel p-5 sm:p-6 xl:sticky xl:top-28">
        <p className="tavern-eyebrow">Nueva partida</p>
        <h2 className="font-display mt-2 text-3xl font-bold text-wood">Registrar partida</h2>
        <p className="mt-3 text-sm font-semibold leading-6 text-walnut/65">
          Cuenta únicamente para esta taberna. No modifica las partidas personales de ningún participante.
        </p>

        {games.length ? (
          <form className="mt-5 grid gap-5" onSubmit={submit}>
            <label>
              <span className="field-label">Juego</span>
              <select className="field-input mt-2" value={gameId} onChange={(event) => setGameId(event.target.value)} required>
                {games.map((game) => <option key={game.gameId} value={game.gameId}>{game.title} · {game.copyCount} {game.copyCount === 1 ? "copia" : "copias"}</option>)}
              </select>
            </label>
            <label>
              <span className="field-label">Fecha</span>
              <input className="field-input mt-2" type="date" value={playedAt} max={new Date().toISOString().slice(0, 10)} onChange={(event) => setPlayedAt(event.target.value)} required />
            </label>
            <fieldset>
              <legend className="field-label">Participantes</legend>
              <div className="mt-2 grid max-h-64 gap-2 overflow-y-auto rounded-md border border-walnut/12 bg-white/60 p-2">
                {sortedMembers.map((member) => (
                  <label key={member.user.id} className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 hover:bg-vanilla">
                    <input type="checkbox" checked={participants.includes(member.user.id)} onChange={() => toggleParticipant(member.user.id)} />
                    <span className="min-w-0 text-sm font-bold text-wood">{member.user.displayName}{member.user.id === currentUserId ? " (tú)" : ""}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <button className="button-primary" type="submit" disabled={pending || !participants.length}>
              {pending ? <Loader2 className="animate-spin" size={17} /> : <Dices size={17} />}
              {pending ? "Guardando..." : "Registrar partida"}
            </button>
          </form>
        ) : (
          <p className="mt-5 rounded-md border border-walnut/10 bg-white/60 p-4 text-sm font-semibold leading-6 text-walnut/65">
            La taberna necesita al menos un juego en su ludoteca antes de registrar partidas.
          </p>
        )}
        {feedback ? <p className={`mt-4 rounded-md border px-4 py-3 text-sm font-bold ${feedback.tone === "success" ? "border-moss/20 bg-moss/8 text-moss" : "border-ruby/20 bg-ruby/8 text-ruby"}`} role={feedback.tone === "error" ? "alert" : "status"}>{feedback.text}</p> : null}
      </section>

      <section>
        <p className="tavern-eyebrow">Historial del grupo</p>
        <h2 className="font-display mt-2 text-3xl font-bold text-wood">Partidas de la taberna</h2>
        {initialPlays.length ? (
          <div className="mt-5 grid gap-4">
            {initialPlays.map((play) => (
              <article key={play.id} className="tavern-card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    {play.slug ? <Link href={`/juegos/${play.slug}`} className="font-display text-2xl font-bold text-wood hover:text-ember">{play.title}</Link> : <h3 className="font-display text-2xl font-bold text-wood">{play.title}</h3>}
                    <p className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-walnut/62"><CalendarDays size={16} /> <time dateTime={play.playedAt}>{formatDate(play.playedAt)}</time></p>
                  </div>
                  {play.canDelete ? (
                    <button className="focus-ring inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-ruby/20 text-ruby hover:bg-ruby/8" disabled={deletingId === play.id} onClick={() => void remove(play.id)} aria-label={`Eliminar partida de ${play.title}`}>
                      {deletingId === play.id ? <Loader2 className="animate-spin" size={17} /> : <Trash2 size={17} />}
                    </button>
                  ) : null}
                </div>
                <div className="mt-4 border-t border-walnut/10 pt-4">
                  <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.1em] text-walnut/45"><UsersRound size={15} /> Participantes</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-walnut/72">{play.participants.map((person) => person.displayName).join(", ")}</p>
                  <p className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-walnut/48"><UserRound size={14} /> Registrada por {play.recordedBy?.displayName || "Usuario eliminado"}</p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="tavern-card mt-5 p-8 text-center">
            <Dices className="mx-auto text-ember" size={36} />
            <h3 className="font-display mt-4 text-3xl font-bold text-wood">Todavía no hay partidas</h3>
            <p className="mt-3 text-sm font-semibold text-walnut/65">La primera quedará guardada aquí con su fecha y participantes.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${value}T12:00:00.000Z`));
}
