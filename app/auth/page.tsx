import { PublicShell } from "@/components/PublicShell";
import { AuthPageClient } from "@/components/auth/AuthPageClient";

type AuthPageProps = {
  searchParams?: Promise<{
    next?: string | string[];
    mode?: string | string[];
  }>;
};

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const nextValue = Array.isArray(params?.next) ? params?.next[0] : params?.next;
  const modeValue = Array.isArray(params?.mode) ? params?.mode[0] : params?.mode;
  const nextPath =
    typeof nextValue === "string" && nextValue.startsWith("/")
      ? nextValue
      : "/mi-perfil";
  const initialMode = modeValue === "register" ? "register" : "login";

  return (
    <PublicShell>
      <main className="container-page py-10 lg:py-16">
        <AuthPageClient initialMode={initialMode} nextPath={nextPath} />
      </main>
    </PublicShell>
  );
}
