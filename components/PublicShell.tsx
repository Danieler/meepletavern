import { CookieConsentBanner } from "@/components/CookieConsentBanner";
import { ConsentAwareVercelAnalytics } from "@/components/ConsentAwareVercelAnalytics";
import { FeedbackButton } from "@/components/FeedbackButton";
import { LegalAcceptanceSync } from "@/components/LegalAcceptanceSync";
import { MobileSignupBar } from "@/components/auth-cta/MobileSignupBar";
import { PublicFooter } from "@/components/PublicFooter";
import { PublicHeader } from "@/components/PublicHeader";
import { PostAuthCoordinator } from "@/components/auth/PostAuthCoordinator";

export function PublicShell({ children }: { children: React.ReactNode }) {
  const analyticsEnabled = process.env.NEXT_PUBLIC_ANALYTICS_ENABLED !== "false";

  return (
    <>
      <PublicHeader />
      {children}
      <PublicFooter />
      <FeedbackButton />
      <MobileSignupBar />
      <LegalAcceptanceSync />
      <PostAuthCoordinator />
      {analyticsEnabled ? (
        <>
          <CookieConsentBanner />
          <ConsentAwareVercelAnalytics />
        </>
      ) : null}
    </>
  );
}
