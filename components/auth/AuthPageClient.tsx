"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { useAuth } from "@/hooks/useAuth";
import type { AuthContext } from "@/components/auth-cta/authCtaUrl";

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
    signInWithGoogleIdToken,
    signUp
  } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.replace(nextPath);
    }
  }, [loading, nextPath, router, user]);

  return (
    <AuthScreen
      initialMode={initialMode}
      authContext={authContext}
      isConfigured={isConfigured}
      onSignIn={async (email, password) => {
        const result = await signIn(email, password);
        if (result.ok) {
          router.replace(nextPath);
        }
        return result;
      }}
      onSignUp={async (email, password, name) => {
        const result = await signUp(email, password, name);
        if (result.ok && !result.requiresEmailConfirmation) {
          if (nextPath === "/mi-perfil" || nextPath === "/") {
            router.replace("/juegos?welcome=true");
          } else {
            router.replace(nextPath);
          }
        }
        return result;
      }}
      onGoogleIdTokenSignIn={async (credential) => {
        const result = await signInWithGoogleIdToken(credential);
        if (result.ok) {
          router.replace(nextPath);
        }
        return result;
      }}
      onGoogleSignIn={async () => signInWithGoogle(nextPath)}
    />
  );
}
