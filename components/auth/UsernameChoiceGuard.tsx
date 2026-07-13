"use client";

import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { buildUsernameOnboardingPath } from "@/lib/usernames";

export function UsernameChoiceGuard() {
  const { loading, user } = useAuth();

  useEffect(() => {
    if (loading || !user) return;
    const cacheKey = `meepletavern_username_ready:${user.id}`;
    if (window.sessionStorage.getItem(cacheKey) === "1") return;

    const controller = new AbortController();
    fetch("/api/account/username", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json() as Promise<{ required?: boolean }>;
      })
      .then((result) => {
        if (!result) return;
        if (result.required) {
          const next = `${window.location.pathname}${window.location.search}${window.location.hash}`;
          window.location.replace(buildUsernameOnboardingPath(next));
          return;
        }
        window.sessionStorage.setItem(cacheKey, "1");
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, [loading, user]);

  return null;
}
