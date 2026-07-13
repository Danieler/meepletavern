import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  normalizeOnboardingGameIds,
  normalizeOnboardingSource,
  syncOnboardingGamesForUser
} from "@/lib/onboardingGames";
import { createClient } from "@/lib/supabase/server";
import { upsertAppUserFromAuthUser } from "@/lib/userAccounts";
import { getSafeInternalPath } from "@/lib/safeNextPath";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = getSafeInternalPath(url.searchParams.get("next"));

  if (code) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(new URL("/auth?mode=login", url.origin));
    }

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (user) {
      const account = await upsertAppUserFromAuthUser(user);
      const onboardingGameIds = normalizeOnboardingGameIds(user.user_metadata?.meepletavern_onboarding_games);

      if (onboardingGameIds.length > 0) {
        await syncOnboardingGamesForUser({
          appUser: account,
          gameIds: onboardingGameIds,
          source: normalizeOnboardingSource(user.user_metadata?.meepletavern_onboarding_source)
        });
      }
    }
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
