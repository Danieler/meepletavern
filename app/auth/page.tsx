import { PublicShell } from "@/components/PublicShell";
import { AuthPageClient } from "@/components/auth/AuthPageClient";

type AuthPageProps = {
  searchParams: Promise<{
    next?: string;
    mode?: string;
  }>;
};

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const params = await searchParams;
  const nextPath =
    typeof params.next === "string" && params.next.startsWith("/")
      ? params.next
      : "/mi-perfil";
  const initialMode = params.mode === "register" ? "register" : "login";

  return (
    <PublicShell>
      <main className="container-page py-10 lg:py-16">
        <AuthPageClient initialMode={initialMode} nextPath={nextPath} />
      </main>
    </PublicShell>
  );
}
