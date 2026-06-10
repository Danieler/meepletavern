import Link from "next/link";
import { GameStatus } from "@prisma/client";
import { Pencil } from "lucide-react";
import { AdminDatabaseNotice } from "@/components/AdminDatabaseNotice";
import { DeleteGameButton } from "@/components/AdminDeleteButtons";
import { SectionHeader } from "@/components/SectionHeader";
import { getAdminDatabaseError } from "@/lib/adminDatabaseError";
import { getAdminGames } from "@/lib/games";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  try {
    const games = await getAdminGames();

    return (
      <div>
        <SectionHeader
          title="Admin de reseñas"
          description="Revisa y corrige el resumen, la descripción, la reseña, pros y contras de cada juego."
        />
        <div className="overflow-hidden rounded-md border border-ink/10 bg-white shadow-soft">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-ink/10 text-left text-sm">
              <thead className="bg-ink/5 text-xs uppercase text-ink/50">
                <tr>
                  <th className="px-4 py-3">Juego</th>
                  <th className="px-4 py-3">Resumen</th>
                  <th className="px-4 py-3">Reseña</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/10">
                {games.map((game) => (
                  <tr key={game.id}>
                    <td className="px-4 py-3 font-bold text-ink">{game.name}</td>
                    <td className="max-w-xs px-4 py-3 text-ink/65">{game.shortSummary || "Pendiente"}</td>
                    <td className="max-w-xs px-4 py-3 text-ink/65">{game.review || "Pendiente"}</td>
                    <td className="px-4 py-3 text-ink/65">{game.status}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Link className="button-secondary min-h-9 px-3 py-1.5" href={`/admin/games/${game.id}/edit#contenido-editorial`}>
                          <Pencil size={16} aria-hidden="true" />
                          Editar
                        </Link>
                        <DeleteGameButton
                          id={game.id}
                          returnTo="/admin/reviews"
                          published={game.status === GameStatus.published}
                          compact
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
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
