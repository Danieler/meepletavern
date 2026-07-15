import { CookieConsentBanner } from "@/components/CookieConsentBanner";
import { ConsentAwareVercelAnalytics } from "@/components/ConsentAwareVercelAnalytics";
import { FeedbackButton } from "@/components/FeedbackButton";
import { LegalAcceptanceSync } from "@/components/LegalAcceptanceSync";
import { MobileSignupBar } from "@/components/auth-cta/MobileSignupBar";
import { PublicFooter } from "@/components/PublicFooter";
import { PublicHeader } from "@/components/PublicHeader";
import { PostAuthCoordinator } from "@/components/auth/PostAuthCoordinator";
import { AuthProvider } from "@/hooks/useAuth";

export function PublicShell({
  children,
  mode = "public"
}: {
  children: React.ReactNode;
  mode?: "public" | "account";
}) {
  const analyticsEnabled = process.env.NEXT_PUBLIC_ANALYTICS_ENABLED !== "false";

  return (
    <AuthProvider>
      <PublicHeader />
      {children}
      <PublicFooter />
      <FeedbackButton />
      {mode === "public" ? <MobileSignupBar /> : null}
      <LegalAcceptanceSync />
      {mode === "public" ? <PostAuthCoordinator /> : null}
      {analyticsEnabled ? (
        <>
          <CookieConsentBanner />
          <ConsentAwareVercelAnalytics />
        </>
      ) : null}
    </AuthProvider>
  );
}
