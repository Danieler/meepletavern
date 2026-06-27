import { LEGAL_VERSION } from "@/lib/legalConstants";

const LEGAL_ACCEPTANCE_STORAGE_KEY = "meepletavern_legal_acceptance";

type PendingLegalAcceptance = {
  acceptedAt: string;
  termsVersion: string;
  privacyVersion: string;
};

export function rememberLegalAcceptance() {
  if (typeof window === "undefined") {
    return;
  }

  const acceptedAt = new Date().toISOString();
  const payload: PendingLegalAcceptance = {
    acceptedAt,
    termsVersion: LEGAL_VERSION,
    privacyVersion: LEGAL_VERSION
  };

  window.sessionStorage.setItem(LEGAL_ACCEPTANCE_STORAGE_KEY, JSON.stringify(payload));
}

export async function syncPendingLegalAcceptance() {
  if (typeof window === "undefined") {
    return;
  }

  const rawValue = window.sessionStorage.getItem(LEGAL_ACCEPTANCE_STORAGE_KEY);
  if (!rawValue) {
    return;
  }

  let payload: PendingLegalAcceptance;
  try {
    const parsed = JSON.parse(rawValue) as Partial<PendingLegalAcceptance>;
    payload = {
      acceptedAt: typeof parsed.acceptedAt === "string" ? parsed.acceptedAt : new Date().toISOString(),
      termsVersion: typeof parsed.termsVersion === "string" ? parsed.termsVersion : LEGAL_VERSION,
      privacyVersion: typeof parsed.privacyVersion === "string" ? parsed.privacyVersion : LEGAL_VERSION
    };
  } catch {
    payload = {
      acceptedAt: new Date().toISOString(),
      termsVersion: LEGAL_VERSION,
      privacyVersion: LEGAL_VERSION
    };
  }

  const response = await fetch("/api/account/legal-acceptance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (response.ok) {
    window.sessionStorage.removeItem(LEGAL_ACCEPTANCE_STORAGE_KEY);
  }
}
