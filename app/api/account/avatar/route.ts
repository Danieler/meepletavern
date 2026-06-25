import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AVATAR_BUCKET, MAX_AVATAR_SIZE, avatarMimeTypes } from "@/lib/supabase/avatarStorage";
import { createClient } from "@/lib/supabase/server";

function previousAvatarPath(value: FormDataEntryValue | null, userId: string) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  try {
    const url = new URL(value);
    const marker = `/storage/v1/object/public/${AVATAR_BUCKET}/`;
    const markerIndex = url.pathname.indexOf(marker);

    if (markerIndex === -1) {
      return null;
    }

    const storagePath = decodeURIComponent(url.pathname.slice(markerIndex + marker.length));
    return storagePath.startsWith(`${userId}/`) ? storagePath : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("avatar");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Elige una imagen para subir." }, { status: 400 });
  }

  const extension = avatarMimeTypes.get(file.type);

  if (!extension) {
    return NextResponse.json({ error: "El avatar debe ser JPG, PNG, WebP o GIF." }, { status: 400 });
  }

  if (file.size > MAX_AVATAR_SIZE) {
    return NextResponse.json(
      { error: `La imagen debe pesar menos de ${MAX_AVATAR_SIZE / (1024 * 1024)} MB.` },
      { status: 400 }
    );
  }

  const storagePath = `${user.id}/${Date.now()}-${randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage.from(AVATAR_BUCKET).upload(storagePath, file, {
    cacheControl: "31536000",
    contentType: file.type,
    upsert: false
  });

  if (uploadError) {
    return NextResponse.json(
      { error: uploadError.message || "No hemos podido subir la imagen." },
      { status: 400 }
    );
  }

  const oldAvatarPath = previousAvatarPath(formData?.get("previousAvatarUrl") ?? null, user.id);
  if (oldAvatarPath) {
    await supabase.storage.from(AVATAR_BUCKET).remove([oldAvatarPath]);
  }

  const {
    data: { publicUrl }
  } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(storagePath);

  return NextResponse.json({ avatarUrl: publicUrl, avatarPath: storagePath });
}
