import { PublicShell } from "@/components/PublicShell";
import { AuthPageClient } from "@/components/auth/AuthPageClient";

type AuthPageProps = {
  searchParams?: Promise<{
    next?: string | string[];
    mode?: string | string[];
    intent?: string | string[];
  }>;
};

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const nextValue = Array.isArray(params?.next) ? params?.next[0] : params?.next;
  const modeValue = Array.isArray(params?.mode) ? params?.mode[0] : params?.mode;
  const intentValue = Array.isArray(params?.intent) ? params?.intent[0] : params?.intent;
  const nextPath =
    typeof nextValue === "string" && nextValue.startsWith("/")
      ? nextValue
      : "/mi-perfil";
  const initialMode = modeValue === "register" ? "register" : "login";
  const redirectPath = appendIntent(nextPath, typeof intentValue === "string" ? intentValue : undefined);

  return (
    <PublicShell>
      <main className="container-page py-10 lg:py-16">
        <AuthPageClient initialMode={initialMode} nextPath={redirectPath} />
      </main>
    </PublicShell>
  );
}

function appendIntent(nextPath: string, intent?: string) {
  const safeIntent = intent?.trim();
  if (!safeIntent || /[^\w-]/.test(safeIntent) || nextPath.includes("intent=")) {
    return nextPath;
  }

  const hashIndex = nextPath.indexOf("#");
  const withoutHash = hashIndex >= 0 ? nextPath.slice(0, hashIndex) : nextPath;
  const hash = hashIndex >= 0 ? nextPath.slice(hashIndex) : "";
  const separator = withoutHash.includes("?") ? "&" : "?";

  return `${withoutHash}${separator}intent=${encodeURIComponent(safeIntent)}${hash}`;
}
