import Link from "next/link";
import type { CatalogGame } from "@/lib/catalog";

export function GameRatings({ game }: { game: CatalogGame }) {
  const hasBggData = Boolean(game.bggId || game.bggAverageRating || game.bggRank || game.bggWeight);

  return (
    <section className="container-page pb-10">
      <div className={`grid gap-4 ${hasBggData ? "lg:grid-cols-[1fr_1.5fr]" : ""}`}>
        <article className="rounded-md border border-ink/10 bg-white p-5 shadow-soft">
          <p className="text-xs font-bold uppercase tracking-wide text-ink/45">MeepleTavern Score</p>
          <p className="mt-3 text-3xl font-black text-ink">Pendiente</p>
          <p className="mt-2 text-sm leading-6 text-ink/60">
            La puntuación editorial numérica todavía no está disponible en esta ficha.
          </p>
        </article>

        {hasBggData ? (
          <article className="rounded-md border border-ink/10 bg-white p-5 shadow-soft">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-ruby">BoardGameGeek</p>
                <h2 className="mt-1 text-xl font-black text-ink">Datos de BoardGameGeek</h2>
              </div>
              {game.bggUrl ? (
                <Link className="button-secondary min-h-9 px-3 py-1.5 text-sm" href={game.bggUrl} target="_blank" rel="noreferrer">
                  Ver en BGG
                </Link>
              ) : null}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <Metric label="Rating BGG" value={formatNumber(game.bggAverageRating)} />
              <Metric label="Bayes" value={formatNumber(game.bggBayesAverageRating)} />
              <Metric label="Usuarios" value={formatInteger(game.bggUsersRated)} />
              <Metric label="Rank" value={game.bggRank ? `#${formatInteger(game.bggRank)}` : "Sin rank"} />
              <Metric label="Weight" value={formatNumber(game.bggWeight)} />
              <Metric label="Votos weight" value={formatInteger(game.bggWeightVotes)} />
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <MiniInfo label="Jugadores" value={formatPlayers(game.bggMinPlayers, game.bggMaxPlayers)} />
              <MiniInfo label="Duración" value={game.bggPlayingTime ? `${game.bggPlayingTime} min` : "Sin dato"} />
              <MiniInfo label="Edad" value={game.bggMinAge ? `${game.bggMinAge}+` : "Sin dato"} />
              <MiniInfo label="Año" value={game.bggYearPublished ? String(game.bggYearPublished) : "Sin dato"} />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-ink/50">
              <span>Datos de BoardGameGeek</span>
              {game.bggLastSyncedAt ? <span>· sincronizado el {formatDate(game.bggLastSyncedAt)}</span> : null}
            </div>
          </article>
        ) : null}
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-ink/10 bg-parchment/40 p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-ink/45">{label}</p>
      <p className="mt-1 text-lg font-black text-ink">{value}</p>
    </div>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-ink/5 p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-ink/45">{label}</p>
      <p className="mt-1 text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}

function formatNumber(value: number | null) {
  if (value === null) {
    return "Sin dato";
  }

  return new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2
  }).format(value);
}

function formatInteger(value: number | null) {
  if (value === null) {
    return "Sin dato";
  }

  return new Intl.NumberFormat("es-ES").format(value);
}

function formatPlayers(minPlayers: number | null, maxPlayers: number | null) {
  if (!minPlayers && !maxPlayers) {
    return "Sin dato";
  }

  if (minPlayers && maxPlayers && minPlayers !== maxPlayers) {
    return `${minPlayers}-${maxPlayers}`;
  }

  return String(minPlayers || maxPlayers || "");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}
