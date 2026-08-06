"use client";

import Link from "next/link";
import { GameSuggestionStatus } from "@prisma/client";
import { CheckCircle2, ExternalLink, RefreshCw, User } from "lucide-react";
import { useAdminI18n } from "@/lib/adminI18n";
import { AdminSectionHeader } from "@/components/AdminSectionHeader";

type SuggestionItem = {
  id: string;
  name: string;
  notes: string | null;
  url: string | null;
  status: GameSuggestionStatus;
  createdAt: string;
  user: {
    displayName: string | null;
    email: string;
    username: string | null;
  };
};

export function AdminSuggestionsTable({
  suggestions,
  markSuggestionAction,
  DeleteSuggestionForm
}: {
  suggestions: SuggestionItem[];
  markSuggestionAction: (formData: FormData) => Promise<void>;
  DeleteSuggestionForm: React.ComponentType<{ id: string; name: string }>;
}) {
  const { lang, t } = useAdminI18n();

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        titleKey="suggestions.title"
        descriptionKey="suggestions.description"
      />

      {!suggestions.length ? (
        <p className="rounded-md border border-ink/10 bg-white px-4 py-10 text-center text-ink/60 shadow-soft">
          {lang === "en" ? "No community suggestions submitted yet." : "Todavía no hay sugerencias enviadas por los usuarios."}
        </p>
      ) : (
        <div className="overflow-hidden rounded-md border border-ink/10 bg-white shadow-soft">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-ink/10 text-left text-sm">
              <thead className="bg-ink text-white">
                <tr>
                  <th className="px-4 py-3 font-bold uppercase tracking-wider text-xs">{t("games.colName")}</th>
                  <th className="px-4 py-3 font-bold uppercase tracking-wider text-xs">{lang === "en" ? "User" : "Usuario"}</th>
                  <th className="px-4 py-3 font-bold uppercase tracking-wider text-xs">{lang === "en" ? "Notes / Link" : "Notas / Enlace"}</th>
                  <th className="px-4 py-3 font-bold uppercase tracking-wider text-xs">{t("reviews.colDate")}</th>
                  <th className="px-4 py-3 font-bold uppercase tracking-wider text-xs">{t("games.colStatus")}</th>
                  <th className="px-4 py-3 font-bold uppercase tracking-wider text-xs text-right">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/10 bg-white">
                {suggestions.map((suggestion) => {
                  const userDisplayName = suggestion.user.displayName || suggestion.user.username || (lang === "en" ? "User" : "Usuario");
                  const isImported = suggestion.status === GameSuggestionStatus.IMPORTED;

                  return (
                    <tr key={suggestion.id} className="align-middle hover:bg-ink/5">
                      <td className="px-4 py-4.5 font-bold text-ink">
                        {suggestion.name}
                      </td>
                      <td className="px-4 py-4.5">
                        <div className="flex flex-col">
                          <span className="font-semibold text-ink/80 flex items-center gap-1">
                            <User size={14} className="text-ink/40" />
                            {userDisplayName}
                          </span>
                          {suggestion.user.username ? (
                            <span className="text-xs text-ink/45">@{suggestion.user.username}</span>
                          ) : null}
                          <span className="text-xs text-ink/45">{suggestion.user.email}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4.5 max-w-xs md:max-w-md">
                        <div className="space-y-1">
                          {suggestion.notes ? (
                            <p className="text-ink/70 italic text-xs leading-5">&quot;{suggestion.notes}&quot;</p>
                          ) : (
                            <span className="text-xs text-ink/35 italic">{lang === "en" ? "No notes" : "Sin notas"}</span>
                          )}
                          {suggestion.url ? (
                            <a
                              href={suggestion.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-bold text-ember hover:underline"
                            >
                              <ExternalLink size={12} />
                              {lang === "en" ? "Reference link" : "Enlace de referencia"}
                            </a>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-4.5 whitespace-nowrap text-ink/75">
                        {formatDate(suggestion.createdAt, lang)}
                      </td>
                      <td className="px-4 py-4.5 whitespace-nowrap">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-black uppercase tracking-wider ${statusBadgeClass(suggestion.status)}`}>
                          {statusLabel(suggestion.status, lang, t)}
                        </span>
                      </td>
                      <td className="px-4 py-4.5 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            className="button-primary min-h-9 px-3 text-xs"
                            href={`/admin/import?q=${encodeURIComponent(suggestion.name)}`}
                            title={lang === "en" ? "Load into master importer" : "Cargar nombre en el importador maestro"}
                          >
                            {t("nav.import")}
                          </Link>

                          <form action={markSuggestionAction}>
                            <input type="hidden" name="id" value={suggestion.id} />
                            <input
                              type="hidden"
                              name="status"
                              value={isImported ? GameSuggestionStatus.PENDING : GameSuggestionStatus.IMPORTED}
                            />
                            {isImported ? (
                              <button
                                className="button-secondary min-h-9 px-3 text-ink/50 hover:bg-ink/5 hover:text-ink/80 text-xs flex items-center gap-1"
                                type="submit"
                                title={lang === "en" ? "Reopen suggestion" : "Reabrir sugerencia"}
                              >
                                <RefreshCw size={14} aria-hidden="true" />
                                <span>{lang === "en" ? "Reopen" : "Reabrir"}</span>
                              </button>
                            ) : (
                              <button
                                className="button-secondary min-h-9 px-3 text-moss hover:bg-moss/5 hover:border-moss/40 text-xs flex items-center gap-1"
                                type="submit"
                                title={lang === "en" ? "Mark as done" : "Marcar como realizada"}
                              >
                                <CheckCircle2 size={14} className="stroke-[2.5]" aria-hidden="true" />
                                <span>{lang === "en" ? "Done" : "Realizada"}</span>
                              </button>
                            )}
                          </form>

                          <DeleteSuggestionForm id={suggestion.id} name={suggestion.name} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDate(date: string, lang: string = "es") {
  const locale = lang === "en" ? "en-US" : "es-ES";
  return new Date(date).toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function statusBadgeClass(status: GameSuggestionStatus) {
  switch (status) {
    case GameSuggestionStatus.IMPORTED:
      return "bg-moss/10 text-moss";
    case GameSuggestionStatus.REVIEWED:
      return "bg-indigo-100 text-indigo-700";
    case GameSuggestionStatus.REJECTED:
      return "bg-red-100 text-red-700";
    case GameSuggestionStatus.PENDING:
    default:
      return "bg-walnut/10 text-walnut/70";
  }
}

function statusLabel(
  status: GameSuggestionStatus,
  lang: string,
  t: ReturnType<typeof useAdminI18n>["t"]
) {
  switch (status) {
    case GameSuggestionStatus.IMPORTED:
      return lang === "en" ? "Done" : "Realizada";
    case GameSuggestionStatus.REVIEWED:
      return lang === "en" ? "Reviewed" : "Revisada";
    case GameSuggestionStatus.REJECTED:
      return t("status.rejected");
    case GameSuggestionStatus.PENDING:
    default:
      return t("status.pending");
  }
}
