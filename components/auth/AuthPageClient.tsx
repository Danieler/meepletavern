"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { useAuth } from "@/hooks/useAuth";
import type { AuthContext } from "@/components/auth-cta/authCtaUrl";
import { syncPendingLegalAcceptance } from "@/lib/legalAcceptanceClient";
import { buildUsernameOnboardingPath } from "@/lib/usernames";

type AuthPageClientProps = {
  nextPath: string;
  initialMode: "login" | "register";
  authContext?: AuthContext;
};

export function AuthPageClient({ nextPath, initialMode, authContext }: AuthPageClientProps) {
  const router = useRouter();
  const {
    user,
    loading,
    isConfigured,
    signIn,
    signInWithGoogle,
    signInWithDiscord,
    signInWithGoogleIdToken,
    signUp
  } = useAuth();

  useEffect(() => {
    if (loading || !user) {
      return;
    }

    const syncOnboardingGames = async () => {
      try {
        const onboardingGamesStr = sessionStorage.getItem("meepletavern_onboarding_games");
        if (onboardingGamesStr) {
          const gameIds = JSON.parse(onboardingGamesStr);
          if (Array.isArray(gameIds) && gameIds.length > 0) {
            const source = sessionStorage.getItem("meepletavern_onboarding_source") || "auth_onboarding";
            await fetch("/api/account/onboarding/games", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ gameIds, source })
            });
          }
          sessionStorage.removeItem("meepletavern_onboarding_games");
          sessionStorage.removeItem("meepletavern_onboarding_source");
        }
      } catch (err) {
        console.error("Error syncing onboarding games:", err);
      }
    };

    const resolveDestination = async () => {
      try {
        const response = await fetch("/api/account/username", { cache: "no-store" });
        if (!response.ok) {
          return nextPath;
        }

        const payload = (await response.json().catch(() => null)) as { required?: boolean } | null;
        return payload?.required ? buildUsernameOnboardingPath(nextPath) : nextPath;
      } catch {
        return nextPath;
      }
    };

    syncPendingLegalAcceptance()
      .catch((err) => console.error("Error syncing legal acceptance:", err))
      .then(syncOnboardingGames)
      .then(resolveDestination)
      .then((destination) => {
        router.replace(destination);
      });
  }, [loading, nextPath, router, user]);

  return (
    <AuthScreen
      initialMode={initialMode}
      authContext={authContext}
      isConfigured={isConfigured}
      onSignIn={async (email, password) => signIn(email, password)}
      onSignUp={async (email, password, name) => signUp(email, password, name)}
      onGoogleIdTokenSignIn={async (credential) => signInWithGoogleIdToken(credential)}
      onGoogleSignIn={async () => signInWithGoogle(nextPath)}
      onDiscordSignIn={async () => signInWithDiscord(nextPath)}
    />
  );
}
