"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { useAuth } from "@/hooks/useAuth";

type AuthPageClientProps = {
  nextPath: string;
  initialMode: "login" | "register";
};

export function AuthPageClient({ nextPath, initialMode }: AuthPageClientProps) {
  const router = useRouter();
  const { user, loading, isConfigured, signIn, signUp } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.replace(nextPath);
    }
  }, [loading, nextPath, router, user]);

  return (
    <AuthScreen
      initialMode={initialMode}
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
          router.replace(nextPath);
        }
        return result;
      }}
    />
  );
}
