import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PublicShell } from "@/components/PublicShell";
import { GameListEditor } from "@/components/lists/GameListEditor";
import { requireCurrentAppUser } from "@/lib/accountLibrary";
import { GAME_LIST_ITEM_PAGE_SIZE, getListDetailForOwner } from "@/lib/gameLists";

export const metadata: Metadata = {
  title: "Editar lista - MeepleTavern",
  robots: { index: false, follow: false }
};

export default async function MyListDetailPage({ params }: { params: Promise<{ listSlug: string }> }) {
  const { listSlug } = await params;
  let appUser: Awaited<ReturnType<typeof requireCurrentAppUser>>;
  try {
    appUser = await requireCurrentAppUser();
  } catch {
    redirect("/auth");
  }
  const page = await getListDetailForOwner({
    userId: appUser.id,
    listSlug,
    limit: GAME_LIST_ITEM_PAGE_SIZE
  });
  if (!page) notFound();

  return (
    <PublicShell>
      <main className="container-page py-10 lg:py-14">
        <GameListEditor initialPage={page} username={appUser.profile?.username || null} />
      </main>
    </PublicShell>
  );
}
