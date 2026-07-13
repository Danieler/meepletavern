import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { ChooseUsernameClient } from "@/components/auth/ChooseUsernameClient";
import { requireCurrentAppUser } from "@/lib/accountLibrary";
import { getSafeInternalPath } from "@/lib/safeNextPath";
import { isSystemGeneratedUsername } from "@/lib/usernames";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Elige tu nombre de usuario - MeepleTavern",
  robots: { index: false, follow: false }
};

export default async function ChooseUsernamePage({
  searchParams
}: {
  searchParams?: Promise<{ next?: string | string[] }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const rawNext = Array.isArray(params?.next) ? params.next[0] : params?.next;
  const nextPath = getSafeInternalPath(rawNext, "/");
  let account: Awaited<ReturnType<typeof requireCurrentAppUser>>;
  try {
    account = await requireCurrentAppUser();
  } catch {
    redirect(`/auth?mode=login&next=${encodeURIComponent(nextPath)}`);
  }
  if (!isSystemGeneratedUsername(account.profile?.username)) redirect(nextPath);

  return <AuthShell><ChooseUsernameClient nextPath={nextPath} /></AuthShell>;
}
