import { CookieConsentBanner } from "@/components/CookieConsentBanner";
import { ConsentAwareVercelAnalytics } from "@/components/ConsentAwareVercelAnalytics";
import { PublicFooter } from "@/components/PublicFooter";
import { PublicHeader } from "@/components/PublicHeader";

export function PublicShell({ children }: { children: React.ReactNode }) {
  const analyticsEnabled = process.env.NEXT_PUBLIC_ANALYTICS_ENABLED !== "false";

  return (
    <>
      <PublicHeader />
      {children}
      <PublicFooter />
      {analyticsEnabled ? (
        <>
          <CookieConsentBanner />
          <ConsentAwareVercelAnalytics />
        </>
      ) : null}
    </>
  );
}
