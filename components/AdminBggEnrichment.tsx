"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Search, WandSparkles } from "lucide-react";
import { getAdminApiFetchHeaders } from "@/lib/adminApiClient";
import type { BggGameDetails, BggSearchResult } from "@/lib/bgg";

type AdminBggEnrichmentProps = {
  gameId: string;
  gameTitle: string;
  currentBgg?: {
    bggId?: number | null;
    bggUrl?: string | null;
    bggLastSyncedAt?: string | null;
  };
};

type SearchState = {
  error: string | null;
  query: string;
  results: BggSearchResult[];
};

export function AdminBggEnrichment({ gameId, gameTitle, currentBgg }: AdminBggEnrichmentProps) {
  const router = useRouter();
  const [query, setQuery] = useState(gameTitle);
  const [searchState, setSearchState] = useState<SearchState>({
    error: null,
    query: gameTitle,
    results: []
  });
  const [selectedId, setSelectedId] = useState<number | null>(currentBgg?.bggId || null);
  const [details, setDetails] = useState<BggGameDetails | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [overwriteManualFields, setOverwriteManualFields] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void runSearch(gameTitle);
    // We only want the initial auto-search.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameTitle]);

  const hasResults = searchState.results.length > 0;
  const currentLinkLabel = useMemo(() => {
    if (!currentBgg?.bggId) {
      return null;
    }

    const syncedAt = currentBgg.bggLastSyncedAt ? formatDate(currentBgg.bggLastSyncedAt) : "sin sincronizar";
    return `BGG #${currentBgg.bggId} · ${syncedAt}`;
  }, [currentBgg]);

  async function runSearch(nextQuery?: string) {
    const term = (nextQuery ?? query).trim();
    setQuery(term);
    setIsSearching(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/admin/games/${gameId}/bgg/search`, {
        method: "POST",
        headers: getAdminApiFetchHeaders(),
        body: JSON.stringify({ query: term })
      });
      const payload = (await response.json()) as {
        error?: string;
        query?: string;
        results?: BggSearchResult[];
      };

      if (!response.ok) {
        throw new Error(payload.error || "No se pudo buscar en BGG.");
      }

      setSearchState({
        error: null,
        query: payload.query || term,
        results: payload.results || []
      });
      setSelectedId(payload.results?.[0]?.bggId || null);
      setDetails(null);
      setMessage(payload.results?.length ? `Se encontraron ${payload.results.length} resultados.` : "No se encontraron coincidencias en BGG.");
    } catch (searchError) {
      setSearchState((current) => ({
        ...current,
        error: searchError instanceof Error ? searchError.message : "No se pudo buscar en BGG."
      }));
      setError(searchError instanceof Error ? searchError.message : "No se pudo buscar en BGG.");
    } finally {
      setIsSearching(false);
    }
  }

  async function loadDetails(bggId: number) {
    setSelectedId(bggId);
    setIsLoadingDetails(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/admin/games/${gameId}/bgg/details`, {
        method: "POST",
        headers: getAdminApiFetchHeaders(),
        body: JSON.stringify({ bggId })
      });
      const payload = (await response.json()) as {
        error?: string;
        details?: BggGameDetails;
      };

      if (!response.ok || !payload.details) {
        throw new Error(payload.error || "No se pudieron cargar los detalles de BGG.");
      }

      setDetails(payload.details);
      setMessage(`Vista previa cargada para BGG #${payload.details.bggId}.`);
    } catch (detailError) {
      setDetails(null);
      setError(detailError instanceof Error ? detailError.message : "No se pudieron cargar los detalles de BGG.");
    } finally {
      setIsLoadingDetails(false);
    }
  }

  async function applyDetails() {
    if (!selectedId) {
      setError("Selecciona primero un juego de BGG.");
      return;
    }

    setIsApplying(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/admin/games/${gameId}/bgg/apply`, {
        method: "POST",
        headers: getAdminApiFetchHeaders(),
        body: JSON.stringify({
          bggId: selectedId,
          overwriteManualFields
        })
      });
      const payload = (await response.json()) as {
        error?: string;
        appliedFields?: string[];
        overwriteManualFields?: boolean;
      };

      if (!response.ok) {
        throw new Error(payload.error || "No se pudo aplicar BGG.");
      }

      setMessage(
        payload.appliedFields?.length
          ? `BGG aplicado. Campos actualizados: ${payload.appliedFields.join(", ")}.`
          : "BGG aplicado, pero no había campos que rellenar."
      );
      router.refresh();
    } catch (applyError) {
      setError(applyError instanceof Error ? applyError.message : "No se pudo aplicar BGG.");
    } finally {
      setIsApplying(false);
    }
  }

  return (
    <section className="rounded-md border border-ink/10 bg-white p-5 shadow-soft">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-ruby">Enrich with BGG</p>
          <h2 className="text-xl font-bold text-ink">BoardGameGeek</h2>
          <p className="mt-2 text-sm leading-6 text-ink/60">
            Usa BGG para enriquecer metadatos de referencia, puntuaciones y complejidad. No se importan imágenes.
          </p>
          {currentLinkLabel ? <p className="mt-2 text-xs font-semibold text-ink/45">{currentLinkLabel}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <a className="button-secondary min-h-9 px-3 py-1.5 text-sm" href="https://boardgamegeek.com/wiki/page/BGG_XML_API2" target="_blank" rel="noreferrer">
            <ExternalLink size={16} aria-hidden="true" />
            Docs BGG
          </a>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 lg:flex-row">
        <input
          className="field-input flex-1"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar juego en BGG"
        />
        <button className="button-primary" type="button" onClick={() => void runSearch()} disabled={isSearching}>
          <Search size={18} aria-hidden="true" />
          {isSearching ? "Buscando..." : "Buscar en BGG"}
        </button>
      </div>

      {message ? (
        <p className="mt-4 rounded-md border border-moss/20 bg-moss/10 px-4 py-3 text-sm font-semibold text-moss">
          {message}
        </p>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-md border border-ruby/20 bg-ruby/10 px-4 py-3 text-sm font-semibold text-ruby">
          {error}
        </p>
      ) : null}

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_1.15fr]">
        <section className="rounded-md border border-ink/10 bg-parchment/40 p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-bold uppercase tracking-wide text-ink/45">Resultados</h3>
            <span className="text-xs font-semibold text-ink/45">{searchState.results.length}</span>
          </div>

          <div className="mt-4 space-y-3">
            {!hasResults ? (
              <p className="text-sm text-ink/60">
                {isSearching ? "Buscando en BGG..." : "No hay resultados todavía. Prueba con otro título."}
              </p>
            ) : null}

            {searchState.results.map((result) => {
              const active = selectedId === result.bggId;
              return (
                <button
                  key={result.bggId}
                  type="button"
                  onClick={() => void loadDetails(result.bggId)}
                  className={`w-full rounded-md border p-3 text-left transition ${
                    active ? "border-moss bg-moss/10" : "border-ink/10 bg-white hover:border-moss/30"
                  }`}
                  disabled={isLoadingDetails}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-ink">{result.name}</p>
                      <p className="mt-1 text-xs font-semibold uppercase text-ink/45">
                        BGG #{result.bggId}
                        {result.yearPublished ? ` · ${result.yearPublished}` : ""}
                      </p>
                    </div>
                    <span className="rounded-md bg-ink/5 px-2 py-1 text-xs font-bold text-ink/55">
                      {active ? "seleccionado" : "ver"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-md border border-ink/10 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-bold uppercase tracking-wide text-ink/45">Vista previa</h3>
            <button
              type="button"
              className="button-secondary min-h-9 px-3 py-1.5 text-sm"
              onClick={() => void applyDetails()}
              disabled={!selectedId || isApplying || isLoadingDetails}
            >
              <WandSparkles size={16} aria-hidden="true" />
              {isApplying ? "Aplicando..." : "Aplicar BGG data"}
            </button>
          </div>

          <label className="mt-4 flex items-center gap-2 rounded-md bg-ink/5 px-3 py-2 text-sm font-semibold text-ink/70">
            <input
              type="checkbox"
              checked={overwriteManualFields}
              onChange={(event) => setOverwriteManualFields(event.target.checked)}
            />
            Sobrescribir campos manuales vacíos o menos fiables
          </label>
          <p className="mt-2 text-xs leading-5 text-ink/55">
            Por defecto solo rellena campos vacíos y nunca toca la imagen.
          </p>

          {isLoadingDetails ? (
            <p className="mt-4 text-sm font-semibold text-ink/60">Cargando detalles...</p>
          ) : details ? (
            <div className="mt-4 space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <Detail label="Nombre" value={details.name} />
                <Detail label="BGG ID" value={`#${details.bggId}`} />
                <Detail label="Año" value={details.yearPublished ? String(details.yearPublished) : "Sin dato"} />
                <Detail label="Jugadores" value={formatPlayers(details.minPlayers, details.maxPlayers)} />
                <Detail label="Duración" value={details.playingTime ? `${details.playingTime} min` : "Sin dato"} />
                <Detail label="Edad" value={details.minAge ? `${details.minAge}+` : "Sin dato"} />
                <Detail label="BGG rating" value={formatNumber(details.averageRating)} />
                <Detail label="Bayes" value={formatNumber(details.bayesAverageRating)} />
                <Detail label="Usuarios" value={formatInteger(details.usersRated)} />
                <Detail label="Rank" value={details.rank ? `#${details.rank}` : "Sin rank"} />
                <Detail label="Weight" value={formatNumber(details.weight)} />
                <Detail label="Weight votes" value={formatInteger(details.weightVotes)} />
              </div>

              <TitledList title="Diseñadores" values={details.designers} />
              <TitledList title="Artistas" values={details.artists} />
              <TitledList title="Editores" values={details.publishers} />
              <TitledList title="Categorías" values={details.categories} />
              <TitledList title="Mecánicas" values={details.mechanics} />
              <TitledList title="Familias" values={details.families} />

              <div className="rounded-md border border-ink/10 bg-parchment/40 p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-ink/45">Descripción BGG cruda</p>
                <p className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-sm leading-6 text-ink/75">
                  {details.description || "Sin descripción."}
                </p>
              </div>

              <p className="text-xs font-semibold text-ink/45">
                Datos de BoardGameGeek
              </p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-ink/60">Selecciona un resultado para ver su detalle.</p>
          )}
        </section>
      </div>
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-ink/10 bg-parchment/50 p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-ink/45">{label}</p>
      <p className="mt-1 text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}

function TitledList({ title, values }: { title: string; values: string[] }) {
  if (!values.length) {
    return null;
  }

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-ink/45">{title}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {values.map((value) => (
          <span key={value} className="rounded-md bg-ink/5 px-2.5 py-1 text-xs font-semibold text-ink/70">
            {value}
          </span>
        ))}
      </div>
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
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}
