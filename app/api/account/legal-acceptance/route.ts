import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { LEGAL_VERSION } from "@/lib/legalConstants";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { upsertAppUserFromAuthUser } from "@/lib/userAccounts";

function parseAcceptedAt(value: unknown) {
  if (typeof value !== "string") {
    return new Date();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function parseVersion(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : LEGAL_VERSION;
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const acceptedAt = parseAcceptedAt(body.acceptedAt);
  const termsVersion = parseVersion(body.termsVersion);
  const privacyVersion = parseVersion(body.privacyVersion);
  const appUser = await upsertAppUserFromAuthUser(data.user);

  await prisma.user.update({
    where: { id: appUser.id },
    data: {
      termsAcceptedAt: acceptedAt,
      termsVersion,
      privacyAcceptedAt: acceptedAt,
      privacyVersion
    }
  });

  return NextResponse.json({ ok: true });
}
