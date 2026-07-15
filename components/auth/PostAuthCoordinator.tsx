"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { clearPendingAction, executePendingAction, getPendingAction } from "@/lib/pendingActions";
import { trackEvent } from "@/lib/privacySafeAnalytics";
import { buildUsernameOnboardingPath } from "@/lib/usernames";

export function PostAuthCoordinator() {
  const { loading, user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const runningRef = useRef(false);

  useEffect(() => {
    if (loading || !user || runningRef.current || isAuthRoute(pathname)) {
      return;
    }

    const currentUser = user;
    const controller = new AbortController();
    let active = true;
    runningRef.current = true;

    async function coordinatePostAuth() {
      try {
        const usernameReadyKey = `meepletavern_username_ready:${currentUser.id}`;
        const usernameReady = window.sessionStorage.getItem(usernameReadyKey) === "1";

        if (!usernameReady) {
          const response = await fetch("/api/account/username", {
            cache: "no-store",
            signal: controller.signal
          });

          if (!active) return;

          if (response.status === 401) {
            return;
          }

          if (response.ok) {
            const payload = (await response.json().catch(() => null)) as { required?: boolean } | null;
            if (payload?.required) {
              window.location.replace(buildUsernameOnboardingPath(currentBrowserPath()));
              return;
            }
            window.sessionStorage.setItem(usernameReadyKey, "1");
          } else {
            return;
          }
        }

        const pendingAction = getPendingAction();
        if (!pendingAction) {
          return;
        }

        const result = await executePendingAction();
        if (!active || !result) {
          return;
        }

        trackEvent(result.ok ? "pending_action_completed" : "pending_action_failed", {
          type: result.type,
          retryable: result.retryable ?? false
        });

        if (result.ok && result.type === "RATE_GAME" && result.data?.ratings) {
          window.dispatchEvent(new CustomEvent("meepletavern:ratings-updated", { detail: result.data.ratings }));
        }

        if (result.ok) {
          window.dispatchEvent(new CustomEvent("meepletavern:pending-action-completed", { detail: result }));
          router.refresh();
        }
      } catch (error) {
        if ((error as Error)?.name === "AbortError") return;
        try {
          clearPendingAction();
        } catch {
          // Nothing useful to do; a corrupt action should not block navigation.
        }
        console.error("Error coordinating post-auth state:", error);
      } finally {
        runningRef.current = false;
      }
    }

    void coordinatePostAuth();

    return () => {
      active = false;
      controller.abort();
      runningRef.current = false;
    };
  }, [loading, pathname, router, user]);

  return null;
}

function isAuthRoute(pathname: string | null) {
  return (
    pathname === "/auth" ||
    Boolean(pathname?.startsWith("/auth/")) ||
    pathname === "/bienvenida/usuario"
  );
}

function currentBrowserPath() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}
