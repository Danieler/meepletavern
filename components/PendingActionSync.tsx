"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { clearPendingAction, executePendingAction, getPendingAction } from "@/lib/pendingActions";
import { trackEvent } from "@/lib/privacySafeAnalytics";

export function PendingActionSync() {
  const { loading, user } = useAuth();
  const router = useRouter();
  const runningRef = useRef(false);

  useEffect(() => {
    if (loading || !user || runningRef.current) {
      return;
    }

    try {
      if (!getPendingAction()) {
        return;
      }
    } catch (error) {
      clearPendingAction();
      console.error("Error reading pending action:", error);
      return;
    }

    runningRef.current = true;

    executePendingAction()
      .then((result) => {
        if (!result) {
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
          router.refresh();
        }
      })
      .catch((error) => {
        console.error("Error executing pending action:", error);
      })
      .finally(() => {
        runningRef.current = false;
      });
  }, [loading, router, user]);

  return null;
}
