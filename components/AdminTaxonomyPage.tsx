import Link from "next/link";
import { Pencil } from "lucide-react";
import { AdminDatabaseNotice } from "@/components/AdminDatabaseNotice";
import { SectionHeader } from "@/components/SectionHeader";
import { getAdminDatabaseError } from "@/lib/adminDatabaseError";
import { getAdminGames } from "@/lib/games";

type TaxonomyField = "categories" | "mechanics" | "themes";

type AdminTaxonomyPageProps = {
  title: string;
  description: string;
  field: TaxonomyField;
  emptyLabel: string;
};

export async function AdminTaxonomyPage({ title, description, field, emptyLabel }: AdminTaxonomyPageProps) {
  try {
    const games = await getAdminGames();
    const groups = buildGroups(games, field);
    const missingGames = games.filter((game) => !game[field].length);

    return (
      <div>
        <SectionHeader title={title} description={description} />
        <div className="grid gap-5">
          {groups.map((group) => (
            <section key={group.term} className="rounded-md border border-ink/10 bg-white p-5 shadow-soft">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-ink">{group.term}</h2>
                  <p className="mt-1 text-sm font-semibold text-ink/55">
                    {group.games.length} {group.games.length === 1 ? "juego" : "juegos"}
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {group.games.map((game) => (
                  <Link
                    key={game.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-ink/10 p-3 font-semibold text-ink transition hover:border-moss/40 hover:text-moss"
                    href={`/admin/games/${game.id}/edit#taxonomia`}
                  >
                    {game.name}
                    <Pencil size={16} aria-hidden="true" />
                  </Link>
                ))}
              </div>
            </section>
          ))}

          {missingGames.length ? (
            <section className="rounded-md border border-ruby/20 bg-white p-5 shadow-soft">
              <h2 className="text-xl font-black text-ink">{emptyLabel}</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {missingGames.map((game) => (
                  <Link
                    key={game.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-ink/10 p-3 font-semibold text-ink transition hover:border-ruby/40 hover:text-ruby"
                    href={`/admin/games/${game.id}/edit#taxonomia`}
                  >
                    {game.name}
                    <Pencil size={16} aria-hidden="true" />
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
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

function buildGroups<T extends { id: string; name: string } & Record<TaxonomyField, string[]>>(
  games: T[],
  field: TaxonomyField
) {
  const groups = new Map<string, T[]>();

  for (const game of games) {
    for (const term of game[field]) {
      groups.set(term, [...(groups.get(term) || []), game]);
    }
  }

  return [...groups.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], "es"))
    .map(([term, groupedGames]) => ({
      term,
      games: groupedGames.sort((a, b) => a.name.localeCompare(b.name, "es"))
    }));
}
