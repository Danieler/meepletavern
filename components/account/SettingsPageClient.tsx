"use client";

import { useEffect, useRef, useState, type DragEvent, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Eye, EyeOff, ImagePlus, Link2, Loader2, Lock, Save, Trash2, UploadCloud, UserRound } from "lucide-react";
import { UserAvatar } from "@/components/account/UserAvatar";
import { useAuth } from "@/hooks/useAuth";
import { MAX_AVATAR_SIZE, avatarMimeTypes } from "@/lib/supabase/avatarStorage";

const PROFILE_VISIBILITY = {
  PUBLIC: "PUBLIC",
  PRIVATE: "PRIVATE"
} as const;

type ProfileVisibilityValue = (typeof PROFILE_VISIBILITY)[keyof typeof PROFILE_VISIBILITY];

type ProfileFormData = {
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  profileVisibility: ProfileVisibilityValue;
  collectionVisibility: ProfileVisibilityValue;
};

export function SettingsPageClient() {
  const router = useRouter();
  const { user, loading, isConfigured } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [formData, setFormData] = useState<ProfileFormData>({
    username: "",
    displayName: "",
    bio: "",
    avatarUrl: "",
    profileVisibility: PROFILE_VISIBILITY.PUBLIC,
    collectionVisibility: PROFILE_VISIBILITY.PUBLIC
  });
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState("");
  const [isDraggingAvatar, setIsDraggingAvatar] = useState(false);

  useEffect(() => {
    if (!user && !loading) {
      router.push("/auth?next=%2Fmi-perfil%2Fajustes");
      return;
    }

    if (user) {
      fetch("/api/account/profile", { cache: "no-store" })
        .then(async (res) => {
          const payload = await res.json();
          if (payload.account) {
            setFormData({
              username: payload.account.profile?.username || "",
              displayName: payload.account.displayName || "",
              bio: payload.account.profile?.bio || "",
              avatarUrl: payload.account.profile?.avatarUrl || "",
              profileVisibility: payload.account.profile?.profileVisibility || PROFILE_VISIBILITY.PUBLIC,
              collectionVisibility: payload.account.profile?.collectionVisibility || PROFILE_VISIBILITY.PUBLIC
            });
          }
        })
        .finally(() => setFetching(false));
    }
  }, [user, loading, router]);

  if (!isConfigured || loading || fetching) {
    return <p className="py-20 text-center text-xs font-bold uppercase tracking-widest text-walnut/60">Cargando ajustes...</p>;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      const payload = await res.json();

      if (res.ok) {
        setFeedback({ type: "success", message: "Perfil actualizado correctamente." });
      } else {
        setFeedback({ type: "error", message: payload.error || "Error al actualizar el perfil." });
      }
    } catch {
      setFeedback({ type: "error", message: "Error de red al intentar guardar." });
    } finally {
      setSaving(false);
    }
  };

  const displayName = formData.displayName.trim() || user?.email?.split("@")[0] || "Usuario";
  const username = formData.username.trim() || "usuario";
  const publicHref = `/u/${username}`;
  const previewAvatarUrl = avatarPreviewUrl || formData.avatarUrl;

  const handleAvatarFile = async (file: File | undefined) => {
    if (!file) {
      return;
    }

    if (!avatarMimeTypes.has(file.type)) {
      setFeedback({ type: "error", message: "El avatar debe ser JPG, PNG, WebP o GIF." });
      return;
    }

    if (file.size > MAX_AVATAR_SIZE) {
      setFeedback({
        type: "error",
        message: `La imagen debe pesar menos de ${MAX_AVATAR_SIZE / (1024 * 1024)} MB.`
      });
      return;
    }

    const localPreviewUrl = URL.createObjectURL(file);
    setAvatarPreviewUrl(localPreviewUrl);
    setUploadingAvatar(true);
    setFeedback(null);

    const uploadFormData = new FormData();
    uploadFormData.append("avatar", file);
    if (formData.avatarUrl) {
      uploadFormData.append("previousAvatarUrl", formData.avatarUrl);
    }

    try {
      const response = await fetch("/api/account/avatar", {
        method: "POST",
        body: uploadFormData
      });
      const payload = await response.json();

      if (!response.ok || !payload.avatarUrl) {
        setFeedback({ type: "error", message: payload.error || "No hemos podido subir la imagen." });
        setAvatarPreviewUrl("");
        URL.revokeObjectURL(localPreviewUrl);
        return;
      }

      setFormData((current) => ({ ...current, avatarUrl: payload.avatarUrl }));
      setAvatarPreviewUrl("");
      URL.revokeObjectURL(localPreviewUrl);
    } catch {
      setFeedback({ type: "error", message: "Error de red al subir la imagen." });
      setAvatarPreviewUrl("");
      URL.revokeObjectURL(localPreviewUrl);
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleAvatarDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDraggingAvatar(false);
    void handleAvatarFile(event.dataTransfer.files[0]);
  };

  return (
    <section className="space-y-8">
      <header className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
        <div>
          <p className="tavern-eyebrow">Ajustes</p>
          <h1 className="font-display mt-3 text-4xl font-bold text-wood sm:text-5xl">Haz tu perfil inolvidable</h1>
          <p className="mt-4 max-w-2xl text-base font-medium leading-7 text-walnut/75">
            Dale cara, nombre y presencia a tu rincón personal en MeepleTavern.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 lg:justify-end">
          <Link className="button-secondary" href="/mi-perfil">
            <UserRound size={17} />
            Mi perfil
          </Link>
          <Link className="button-secondary" href={publicHref}>
            <Link2 size={17} />
            Ver público
          </Link>
        </div>
      </header>

      {feedback && (
        <div
          className={`rounded-md border px-4 py-3 text-sm font-bold ${
            feedback.type === "success" ? "border-moss/20 bg-moss/10 text-moss" : "border-ruby/20 bg-ruby/10 text-ruby"
          }`}
        >
          {feedback.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="space-y-6">
          <section className="tavern-card p-5 sm:p-6">
            <div className="flex items-center gap-3 border-b border-walnut/10 pb-4">
              <UserRound size={20} className="text-ember" />
              <h2 className="font-display text-2xl font-bold text-wood">Identidad</h2>
            </div>

            <div className="mt-5 grid gap-5">
              <label className="grid gap-2">
                <span className="field-label">Nombre de usuario</span>
                <input
                  value={formData.username}
                  onChange={(event) => setFormData({ ...formData, username: event.target.value })}
                  placeholder="nombre_de_usuario"
                  className="field-input"
                  required
                />
                <span className="text-xs font-semibold text-walnut/55">meepletavern.com/u/{username}</span>
              </label>

              <label className="grid gap-2">
                <span className="field-label">Nombre visible</span>
                <input
                  value={formData.displayName}
                  onChange={(event) => setFormData({ ...formData, displayName: event.target.value })}
                  placeholder="Tu nombre real o alias"
                  className="field-input"
                  required
                />
              </label>

              <label className="grid gap-2">
                <span className="field-label">Bio</span>
                <textarea
                  value={formData.bio}
                  onChange={(event) => setFormData({ ...formData, bio: event.target.value })}
                  placeholder="Cuenta qué te gusta jugar, qué tipo de mesa disfrutas o qué buscas descubrir..."
                  className="field-textarea min-h-36"
                  maxLength={280}
                />
                <span className="justify-self-end text-xs font-semibold text-walnut/50">{formData.bio.length}/280</span>
              </label>

              <div className="grid gap-2">
                <span className="field-label">Foto de perfil</span>
                <label
                  onDragOver={(event) => {
                    event.preventDefault();
                    setIsDraggingAvatar(true);
                  }}
                  onDragLeave={() => setIsDraggingAvatar(false)}
                  onDrop={handleAvatarDrop}
                  className={`focus-ring grid cursor-pointer gap-4 rounded-md border border-dashed p-4 transition sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center ${
                    isDraggingAvatar
                      ? "border-ember bg-ember/10"
                      : "border-walnut/20 bg-white/60 hover:border-ember/45 hover:bg-white"
                  }`}
                >
                  <UserAvatar src={previewAvatarUrl} name={displayName} size="lg" />
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2 text-sm font-extrabold text-wood">
                      {uploadingAvatar ? (
                        <>
                          <Loader2 className="animate-spin text-ember" size={18} />
                          Subiendo imagen...
                        </>
                      ) : (
                        <>
                          <UploadCloud className="text-ember" size={19} />
                          Arrastra una imagen o haz clic para elegir
                        </>
                      )}
                    </span>
                    <span className="mt-2 block text-xs font-semibold leading-5 text-walnut/58">
                      JPG, PNG, WebP o GIF. Máximo 3 MB. La usaremos en tu perfil y en la comunidad.
                    </span>
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="sr-only"
                    disabled={uploadingAvatar}
                    onChange={(event) => void handleAvatarFile(event.target.files?.[0])}
                  />
                </label>
                {formData.avatarUrl || avatarPreviewUrl ? (
                  <button
                    type="button"
                    className="button-secondary justify-self-start"
                    disabled={uploadingAvatar}
                    onClick={() => {
                      setAvatarPreviewUrl("");
                      setFormData({ ...formData, avatarUrl: "" });
                    }}
                  >
                    <Trash2 size={16} />
                    Quitar foto
                  </button>
                ) : null}
              </div>
            </div>
          </section>

          <section className="tavern-card p-5 sm:p-6">
            <div className="flex items-center gap-3 border-b border-walnut/10 pb-4">
              <Lock size={20} className="text-ember" />
              <h2 className="font-display text-2xl font-bold text-wood">Privacidad</h2>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <VisibilityControl
                title="Perfil"
                description="Aparecer en el directorio y dejar que otros vean tu página pública."
                value={formData.profileVisibility}
                onChange={(profileVisibility) => setFormData({ ...formData, profileVisibility })}
              />
              <VisibilityControl
                title="Ludoteca"
                description="Mostrar los juegos que tienes, quieres probar, comprar o ya jugaste."
                value={formData.collectionVisibility}
                onChange={(collectionVisibility) => setFormData({ ...formData, collectionVisibility })}
              />
            </div>
          </section>

          <button type="submit" disabled={saving} className="button-primary min-h-12 w-full sm:w-auto">
            <Save size={17} />
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>

        <aside className="tavern-card sticky top-28 overflow-hidden">
          <div className="bg-wood p-5 text-white">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-ember">Vista pública</p>
            <div className="mt-5 flex items-end gap-4">
              <UserAvatar src={previewAvatarUrl} name={displayName} size="lg" className="border-white/20 bg-paper" />
              <div className="min-w-0">
                <h2 className="font-display truncate text-3xl font-bold leading-tight text-white">{displayName}</h2>
                <p className="mt-1 truncate text-sm font-extrabold text-parchment/65">@{username}</p>
              </div>
            </div>
          </div>
          <div className="p-5">
            <p className="min-h-20 text-sm font-medium leading-6 text-walnut/76">
              {formData.bio.trim() || "Tu bio aparecerá aquí cuando la escribas."}
            </p>
            <div className="mt-5 grid gap-2">
              <PreviewStatus
                label="Perfil"
                publicLabel="Visible"
                privateLabel="Privado"
                isPublic={formData.profileVisibility === PROFILE_VISIBILITY.PUBLIC}
              />
              <PreviewStatus
                label="Ludoteca"
                publicLabel="Visible"
                privateLabel="Privada"
                isPublic={formData.collectionVisibility === PROFILE_VISIBILITY.PUBLIC}
              />
            </div>
          </div>
        </aside>
      </form>
    </section>
  );
}

function VisibilityControl({
  title,
  description,
  value,
  onChange
}: {
  title: string;
  description: string;
  value: ProfileVisibilityValue;
  onChange: (value: ProfileVisibilityValue) => void;
}) {
  const isPublic = value === PROFILE_VISIBILITY.PUBLIC;

  return (
    <div className="rounded-md border border-walnut/10 bg-white/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-xl font-bold text-wood">{title}</h3>
          <p className="mt-2 text-sm font-medium leading-6 text-walnut/68">{description}</p>
        </div>
        {isPublic ? <Eye className="text-moss" size={20} /> : <EyeOff className="text-ruby" size={20} />}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onChange(PROFILE_VISIBILITY.PUBLIC)}
          className={`focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-md border px-3 text-sm font-extrabold transition ${
            isPublic ? "border-moss/35 bg-moss/10 text-moss" : "border-walnut/15 bg-paper text-walnut hover:bg-white"
          }`}
        >
          {isPublic ? <Check size={15} /> : null}
          Público
        </button>
        <button
          type="button"
          onClick={() => onChange(PROFILE_VISIBILITY.PRIVATE)}
          className={`focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-md border px-3 text-sm font-extrabold transition ${
            !isPublic ? "border-ruby/35 bg-ruby/10 text-ruby" : "border-walnut/15 bg-paper text-walnut hover:bg-white"
          }`}
        >
          {!isPublic ? <Check size={15} /> : null}
          Privado
        </button>
      </div>
    </div>
  );
}

function PreviewStatus({
  label,
  publicLabel,
  privateLabel,
  isPublic
}: {
  label: string;
  publicLabel: string;
  privateLabel: string;
  isPublic: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-walnut/10 bg-white/70 px-3 py-2">
      <span className="text-sm font-extrabold text-wood">{label}</span>
      <span className={`text-xs font-black uppercase tracking-[0.1em] ${isPublic ? "text-moss" : "text-ruby"}`}>
        {isPublic ? publicLabel : privateLabel}
      </span>
    </div>
  );
}
