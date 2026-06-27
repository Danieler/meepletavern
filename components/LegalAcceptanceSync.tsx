"use client";

import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { syncPendingLegalAcceptance } from "@/lib/legalAcceptanceClient";

export function LegalAcceptanceSync() {
  const { loading, user } = useAuth();

  useEffect(() => {
    if (loading || !user) {
      return;
    }

    void syncPendingLegalAcceptance().catch((error) => {
      console.error("Error syncing legal acceptance:", error);
    });
  }, [loading, user]);

  return null;
}
