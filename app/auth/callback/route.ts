import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { upsertAppUserFromAuthUser } from "@/lib/userAccounts";

function getSafeNextPath(value: string | null) {
  return value && value.startsWith("/") ? value : "/mi-perfil";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = getSafeNextPath(url.searchParams.get("next"));

  if (code) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(new URL("/auth", url.origin));
    }

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (user) {
      const account = await upsertAppUserFromAuthUser(user);

      if (!account.profile?.username) {
        return NextResponse.redirect(new URL("/mi-perfil/ajustes", url.origin));
      }
    }
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
