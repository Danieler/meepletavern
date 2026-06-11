import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { upsertAppUserFromAuthUser } from "@/lib/userAccounts";

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const account = await upsertAppUserFromAuthUser(user);
  return NextResponse.json({ account });
}

export async function PATCH(request: Request) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { displayName?: unknown } | null;
  const displayName =
    typeof body?.displayName === "string" ? body.displayName.trim().replace(/\s+/g, " ") : "";

  if (displayName.length < 2) {
    return NextResponse.json({ error: "El nombre debe tener al menos 2 caracteres." }, { status: 400 });
  }

  const { error: updateError } = await supabase.auth.updateUser({
    data: {
      name: displayName,
      display_name: displayName
    }
  });

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  const account = await upsertAppUserFromAuthUser({
    id: user.id,
    email: user.email,
    user_metadata: {
      ...user.user_metadata,
      name: displayName,
      display_name: displayName
    }
  });

  return NextResponse.json({ account });
}
