import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireCurrentAppUser } from "@/lib/accountLibrary";
import { trySyncActivityActorProfile } from "@/lib/activity/events";
import { revalidateCommunityProfileCaches } from "@/lib/communityCache";
import { prisma } from "@/lib/prisma";
import {
  getUsernameValidationError,
  normalizeUsername
} from "@/lib/usernames";

const privateHeaders = { "Cache-Control": "private, no-store, max-age=0", "X-Robots-Tag": "noindex, nofollow" };

export async function GET() {
  try {
    const account = await requireCurrentAppUser();
    return NextResponse.json(
      { required: account.profile?.usernameSetupRequired === true },
      { headers: privateHeaders }
    );
  } catch {
    return NextResponse.json({ error: "No autenticado." }, { status: 401, headers: privateHeaders });
  }
}

export async function PATCH(request: Request) {
  let account: Awaited<ReturnType<typeof requireCurrentAppUser>>;
  try {
    account = await requireCurrentAppUser();
  } catch {
    return NextResponse.json({ error: "No autenticado." }, { status: 401, headers: privateHeaders });
  }

  try {
    const body = (await request.json().catch(() => null)) as { username?: unknown } | null;
    const username = normalizeUsername(body?.username);
    const validationError = getUsernameValidationError(username);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400, headers: privateHeaders });
    }

    const updatedAccount = await prisma.user.update({
      where: { id: account.id },
      include: { profile: true },
      data: { profile: { update: { username, usernameSetupRequired: false } } }
    });
    const activityChanged = await trySyncActivityActorProfile(updatedAccount);
    if (activityChanged) revalidateCommunityProfileCaches();

    return NextResponse.json({ username }, { headers: privateHeaders });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "Ese nombre de usuario ya está en uso." },
        { status: 409, headers: privateHeaders }
      );
    }
    return NextResponse.json(
      { error: "No se pudo guardar el nombre de usuario." },
      { status: 500, headers: privateHeaders }
    );
  }
}
