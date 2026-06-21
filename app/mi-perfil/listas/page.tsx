import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PublicShell } from "@/components/PublicShell";
import { GameListsManager } from "@/components/lists/GameListsManager";
import { requireCurrentAppUser } from "@/lib/accountLibrary";
import { ensureDefaultGameList, getMyGameLists } from "@/lib/gameLists";

export const metadata: Metadata = {
  title: "Mis listas - MeepleTavern",
  robots: { index: false, follow: false }
};

export default async function MyListsPage() {
  let appUser: Awaited<ReturnType<typeof requireCurrentAppUser>>;
  try {
    appUser = await requireCurrentAppUser();
  } catch {
    redirect("/auth");
  }
  await ensureDefaultGameList(appUser.id);
  const lists = await getMyGameLists(appUser.id);

  return (
    <PublicShell>
      <main className="container-page py-10 lg:py-14">
        <GameListsManager initialLists={lists} />
      </main>
    </PublicShell>
  );
}
