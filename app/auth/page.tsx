import { AuthShell } from "@/components/auth/AuthShell";
import { AuthPageClient } from "@/components/auth/AuthPageClient";
import type { AuthContext } from "@/components/auth-cta/authCtaUrl";
import { getSafeInternalPath } from "@/lib/safeNextPath";

const VALID_AUTH_CONTEXTS: AuthContext[] = ["owned", "wishlist", "rating", "list", "comment", "table"];

type AuthPageProps = {
  searchParams?: Promise<{
    next?: string | string[];
    mode?: string | string[];
    intent?: string | string[];
    authContext?: string | string[];
  }>;
};

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const nextValue = Array.isArray(params?.next) ? params?.next[0] : params?.next;
  const modeValue = Array.isArray(params?.mode) ? params?.mode[0] : params?.mode;
  const intentValue = Array.isArray(params?.intent) ? params?.intent[0] : params?.intent;
  const authContextValue = Array.isArray(params?.authContext) ? params?.authContext[0] : params?.authContext;

  const nextPath = getSafeInternalPath(typeof nextValue === "string" ? nextValue : null);

  // Por defecto mostramos register (la página es principalmente de registro)
  const initialMode = modeValue === "login" ? "login" : "register";

  const redirectPath = appendIntent(nextPath, typeof intentValue === "string" ? intentValue : undefined);
  const authContext = VALID_AUTH_CONTEXTS.includes(authContextValue as AuthContext)
    ? (authContextValue as AuthContext)
    : undefined;

  return (
    <AuthShell>
      <main className="container-page pb-10 pt-3 lg:pb-16 lg:pt-8">
        <AuthPageClient initialMode={initialMode} nextPath={redirectPath} authContext={authContext} />
      </main>
    </AuthShell>
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
