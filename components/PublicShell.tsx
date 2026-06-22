import { CookieConsentBanner } from "@/components/CookieConsentBanner";
import { ConsentAwareVercelAnalytics } from "@/components/ConsentAwareVercelAnalytics";
import { FeedbackButton } from "@/components/FeedbackButton";
import { PublicFooter } from "@/components/PublicFooter";
import { PublicHeader } from "@/components/PublicHeader";

export function PublicShell({ children }: { children: React.ReactNode }) {
  const analyticsEnabled = process.env.NEXT_PUBLIC_ANALYTICS_ENABLED !== "false";

  return (
    <>
      <PublicHeader />
      {children}
      <PublicFooter />
      <FeedbackButton />
      {analyticsEnabled ? (
        <>
          <CookieConsentBanner />
          <ConsentAwareVercelAnalytics />
        </>
      ) : null}
    </>
  );
}
