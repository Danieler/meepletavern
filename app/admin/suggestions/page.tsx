import { AdminDatabaseNotice } from "@/components/AdminDatabaseNotice";
import { SectionHeader } from "@/components/SectionHeader";
import { getAdminDatabaseError } from "@/lib/adminDatabaseError";
import { prisma } from "@/lib/prisma";
import { markSuggestionAction } from "./actions";
import { DeleteSuggestionForm } from "./DeleteSuggestionForm";
import { GameSuggestionStatus } from "@prisma/client";
import { Trash2, CheckCircle2, RefreshCw, ExternalLink, User } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminSuggestionsPage() {
  try {
    const suggestions = await prisma.gameSuggestion.findMany({
      include: {
        user: {
          select: {
            displayName: true,
            email: true,
            profile: {
              select: {
                username: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 250
    });

    return (
      <div className="space-y-6">
        <SectionHeader
          title="Sugerencias de juegos"
          description="Lista de juegos propuestos por los taberneros. Puedes importarlos directamente, marcarlos como realizados o eliminarlos."
        />

        {!suggestions.length ? (
          <p className="rounded-md border border-ink/10 bg-white px-4 py-10 text-center text-ink/60 shadow-soft">
            Todavía no hay sugerencias enviadas por los usuarios.
          </p>
        ) : (
          <div className="overflow-hidden rounded-md border border-ink/10 bg-white shadow-soft">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-ink/10 text-left text-sm">
                <thead className="bg-ink text-white">
                  <tr>
                    <th className="px-4 py-3 font-bold uppercase tracking-wider text-xs">Juego</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-wider text-xs">Usuario</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-wider text-xs">Notas / Enlace</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-wider text-xs">Fecha</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-wider text-xs">Estado</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-wider text-xs text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/10 bg-white">
                  {suggestions.map((suggestion) => {
                    const userDisplayName = suggestion.user.displayName || suggestion.user.profile?.username || "Usuario";
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
                            {suggestion.user.profile?.username ? (
                              <span className="text-xs text-ink/45">@{suggestion.user.profile.username}</span>
                            ) : null}
                            <span className="text-xs text-ink/45">{suggestion.user.email}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4.5 max-w-xs md:max-w-md">
                          <div className="space-y-1">
                            {suggestion.notes ? (
                              <p className="text-ink/70 italic text-xs leading-5">&quot;{suggestion.notes}&quot;</p>
                            ) : (
                              <span className="text-xs text-ink/35 italic">Sin notas</span>
                            )}
                            {suggestion.url ? (
                              <a
                                href={suggestion.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-bold text-ember hover:underline"
                              >
                                <ExternalLink size={12} />
                                Enlace de referencia
                              </a>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-4.5 whitespace-nowrap text-ink/75">
                          {formatDate(suggestion.createdAt)}
                        </td>
                        <td className="px-4 py-4.5 whitespace-nowrap">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-black uppercase tracking-wider ${statusBadgeClass(suggestion.status)}`}>
                            {statusLabel(suggestion.status)}
                          </span>
                        </td>
                        <td className="px-4 py-4.5 whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            {/* Import/Pre-fill Master Importer */}
                            <Link
                              className="button-primary min-h-9 px-3 text-xs"
                              href={`/admin/import?q=${encodeURIComponent(suggestion.name)}`}
                              title="Cargar nombre en el importador maestro"
                            >
                              Importar
                            </Link>

                            {/* Mark as realized / Reopen */}
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
                                  title="Reabrir sugerencia"
                                >
                                  <RefreshCw size={14} aria-hidden="true" />
                                  <span>Reabrir</span>
                                </button>
                              ) : (
                                <button
                                  className="button-secondary min-h-9 px-3 text-moss hover:bg-moss/5 hover:border-moss/40 text-xs flex items-center gap-1"
                                  type="submit"
                                  title="Marcar como realizada"
                                >
                                  <CheckCircle2 size={14} className="stroke-[2.5]" aria-hidden="true" />
                                  <span>Realizada</span>
                                </button>
                              )}
                            </form>

                            {/* Delete */}
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
  } catch (error) {
    const databaseError = getAdminDatabaseError(error);
    if (!databaseError) {
      throw error;
    }
    return <AdminDatabaseNotice error={databaseError} />;
  }
}

function formatDate(date: Date | string) {
  const d = new Date(date);
  return d.toLocaleDateString("es-ES", {
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

function statusLabel(status: GameSuggestionStatus) {
  switch (status) {
    case GameSuggestionStatus.IMPORTED:
      return "Realizada";
    case GameSuggestionStatus.REVIEWED:
      return "Revisada";
    case GameSuggestionStatus.REJECTED:
      return "Rechazada";
    case GameSuggestionStatus.PENDING:
    default:
      return "Pendiente";
  }
}
