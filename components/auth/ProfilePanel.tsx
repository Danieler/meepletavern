"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Eye, EyeOff, ListPlus, LogOut, Mail, Settings, UserRound } from "lucide-react";
import { LibraryPanel } from "@/components/account/LibraryPanel";
import { UserRatingsPanel } from "@/components/account/UserRatingsPanel";
import { UserAvatar } from "@/components/account/UserAvatar";
import { GameSuggestionForm } from "@/components/lists/GameSuggestionForm";
import { useAuth } from "@/hooks/useAuth";

type AccountProfile = {
  id: string;
  authUserId: string;
  email: string;
  displayName: string | null;
  createdAt: string;
  profile: {
    username: string;
    displayName: string | null;
    bio: string | null;
    avatarUrl: string | null;
    profileVisibility: "PUBLIC" | "PRIVATE";
    collectionVisibility: "PUBLIC" | "PRIVATE";
  } | null;
};

function formatDate(value: string | undefined) {
  if (!value) {
    return "No disponible";
  }

  try {
    return new Intl.DateTimeFormat("es-ES", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function ProfilePanel() {
  const router = useRouter();
  const { user, loading, warning, isConfigured, signOut } = useAuth();
  const [profile, setProfile] = useState<AccountProfile | null>(null);

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoadingProfile(false);
      return;
    }

    let active = true;
    setLoadingProfile(true);

    fetch("/api/account/profile", { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as { account?: AccountProfile; error?: string } | null;

        if (!active || !payload?.account) {
          return;
        }

        setProfile(payload.account);
      })
      .catch(() => {
        if (active) {
          setFeedback("No hemos podido cargar tu perfil.");
        }
      })
      .finally(() => {
        if (active) {
          setLoadingProfile(false);
        }
      });

    return () => {
      active = false;
    };
  }, [user]);

  if (!isConfigured) {
    return (
      <section className="tavern-card p-6">
        <h1 className="font-display text-2xl font-bold text-wood">Mi perfil</h1>
        <p className="mt-3 text-sm font-semibold text-ruby">
          La zona de cuenta no está configurada todavía, así que el perfil de usuario aún no está disponible.
        </p>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="tavern-card p-6">
        <h1 className="font-display text-2xl font-bold text-wood">Mi perfil</h1>
        <p className="mt-3 text-sm font-semibold text-walnut/65">Cargando tu sesión...</p>
      </section>
    );
  }

  if (!user || (loadingProfile && !profile)) {
    return (
      <section className="space-y-8">
        <section className="relative overflow-hidden rounded-md border border-walnut/15 bg-wood text-white shadow-tavern">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(201,130,31,0.35),transparent_28rem),linear-gradient(135deg,rgba(54,32,22,0.98),rgba(31,31,31,0.96)_58%,rgba(47,79,111,0.45))]" />
          <div className="relative grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
            <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-end">
              <div className="h-20 w-20 shrink-0 animate-pulse rounded-full bg-white/20" />
              <div className="min-w-0 space-y-3">
                <div className="h-4 w-24 animate-pulse rounded bg-white/20" />
                <div className="h-8 w-48 animate-pulse rounded bg-white/30" />
                <div className="h-4 w-32 animate-pulse rounded bg-white/20" />
                <div className="mt-4 h-5 w-full max-w-xl animate-pulse rounded bg-white/10" />
                <div className="h-5 w-full max-w-lg animate-pulse rounded bg-white/10" />
                <div className="mt-5 flex flex-wrap gap-2">
                  <div className="h-10 w-32 animate-pulse rounded bg-white/20" />
                  <div className="h-10 w-24 animate-pulse rounded bg-white/20" />
                </div>
              </div>
            </div>

            <div className="grid gap-3 rounded-md border border-white/10 bg-white/8 p-4 backdrop-blur">
              <div className="h-10 animate-pulse rounded bg-white/10" />
              <div className="h-10 animate-pulse rounded bg-white/10" />
              <div className="h-10 mt-1 animate-pulse rounded bg-white/10" />
            </div>
          </div>
        </section>

        {warning ? (
          <div className="rounded-md border border-ruby/20 bg-ruby/5 px-4 py-3 text-sm font-semibold text-ruby">
            {warning}
          </div>
        ) : null}

        {feedback ? (
          <div className="rounded-md border border-moss/20 bg-moss/10 px-4 py-3 text-sm font-semibold text-moss">
            {feedback}
          </div>
        ) : null}

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <div className="space-y-8">
            <div className="h-64 animate-pulse rounded-md bg-gray-200" /> {/* Placeholder for LibraryPanel */}
            <div className="h-64 animate-pulse rounded-md bg-gray-200" /> {/* Placeholder for UserRatingsPanel */}
          </div>

          <aside className="tavern-card p-5 sm:p-6">
            <h2 className="font-display text-xl font-bold text-wood">Cuenta</h2>
            <dl className="mt-5 space-y-5 text-sm">
              <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-gray-200" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-gray-200" />
            </dl>
          </aside>
        </div>
      </section>
    );
  }

  const displayName = profile?.displayName || user.email?.split("@")[0] || "Usuario";
  const username = profile?.profile?.username;
  const profileName = profile?.profile?.displayName || displayName;
  const avatarUrl = profile?.profile?.avatarUrl;
  const isProfilePublic = profile?.profile?.profileVisibility === "PUBLIC";
  const isCollectionPublic = profile?.profile?.collectionVisibility === "PUBLIC";

  return (
    <section className="space-y-8">
      <section className="relative overflow-hidden rounded-md border border-walnut/15 bg-wood text-white shadow-tavern">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(201,130,31,0.35),transparent_28rem),linear-gradient(135deg,rgba(54,32,22,0.98),rgba(31,31,31,0.96)_58%,rgba(47,79,111,0.45))]" />
        <div className="relative grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
          <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-end">
            <UserAvatar src={avatarUrl} name={profileName} size="xl" className="border-white/20 bg-paper/95" editable={true} />
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-ember">Mi perfil</p>
              <h1 className="font-display mt-2 text-4xl font-bold leading-tight text-white sm:text-5xl">
                {profileName}
              </h1>
              <p className="mt-2 text-sm font-extrabold text-parchment/68">
                {username ? `@${username}` : "Sin usuario público todavía"}
              </p>
              {profile?.profile?.bio ? (
                <p className="mt-4 max-w-2xl text-base font-medium leading-7 text-parchment/78">{profile.profile.bio}</p>
              ) : (
                <div className="mt-4">
                  <p className="max-w-2xl text-base font-medium leading-7 text-parchment/62">
                    Añade una bio breve para que otros sepan qué tipo de juegos te gustan.
                  </p>
                  {!avatarUrl && (
                    <p className="mt-1 text-sm font-bold text-amber-200">
                      ¡Y no olvides subir una foto de perfil pulsando en el avatar!
                    </p>
                  )}
                </div>
              )}
              <div className="mt-5 flex flex-wrap gap-2">
                {username ? (
                  <Link className="button-primary" href={`/u/${username}`}>
                    <UserRound size={17} />
                    Ver público
                  </Link>
                ) : null}
                <Link className="button-secondary bg-white" href="/mi-perfil/ajustes">
                  <Settings size={17} />
                  Ajustes
                </Link>
              </div>
            </div>
          </div>

          <div className="grid gap-3 rounded-md border border-white/10 bg-white/8 p-4 backdrop-blur">
            <VisibilityPill
              label="Perfil"
              value={isProfilePublic ? "Público" : "Privado"}
              icon={isProfilePublic ? Eye : EyeOff}
            />
            <VisibilityPill
              label="Ludoteca"
              value={isCollectionPublic ? "Pública" : "Privada"}
              icon={isCollectionPublic ? Eye : EyeOff}
            />
            <button
              type="button"
              className="button-secondary mt-1 bg-white"
              disabled={signingOut}
              onClick={async () => {
                setSigningOut(true);
                const result = await signOut();
                setSigningOut(false);
                if (result.ok) {
                  router.replace("/");
                  router.refresh();
                  return;
                }
                setFeedback(result.message ?? "No hemos podido cerrar la sesión.");
              }}
            >
              <LogOut size={17} />
              {signingOut ? "Saliendo..." : "Cerrar sesión"}
            </button>
          </div>
        </div>
      </section>

      {warning ? (
        <div className="rounded-md border border-ruby/20 bg-ruby/5 px-4 py-3 text-sm font-semibold text-ruby">
          {warning}
        </div>
      ) : null}

      {feedback ? (
        <div className="rounded-md border border-moss/20 bg-moss/10 px-4 py-3 text-sm font-semibold text-moss">
          {feedback}
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="space-y-8">
          <section className="tavern-card grid gap-5 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-6">
            <div>
              <p className="tavern-eyebrow">Mis listas</p>
              <h2 className="font-display mt-2 text-2xl font-bold text-wood">Guarda tus próximas mesas</h2>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-walnut/65">
                Organiza favoritos y listas personales sin mezclarlo con los estados de tu ludoteca.
              </p>
            </div>
            <Link href="/mi-perfil/listas" className="button-primary">
              <ListPlus size={17} aria-hidden="true" />
              Ver mis listas
            </Link>
          </section>
          <InviteFriendCard inviterName={username ? `@${username}` : profileName} />
          <LibraryPanel embedded />
          <UserRatingsPanel />
          <GameSuggestionForm />
        </div>

        <aside className="tavern-card p-5 sm:p-6">
          <h2 className="font-display text-xl font-bold text-wood">Cuenta</h2>
          <dl className="mt-5 space-y-5 text-sm">
            <AccountDatum label="Email" value={profile?.email || user.email || "No disponible"} />
            <AccountDatum label="Cuenta creada" value={formatDate(profile?.createdAt || user.created_at)} />
            <AccountDatum
              label="Email confirmado"
              value={user.email_confirmed_at ? formatDate(user.email_confirmed_at) : "Pendiente"}
            />
          </dl>
        </aside>
      </div>
    </section>
  );
}

function VisibilityPill({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Eye }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-black/12 px-3 py-2.5">
      <span className="inline-flex items-center gap-2 text-sm font-extrabold text-parchment/80">
        <Icon size={16} />
        {label}
      </span>
      <span className="rounded-md bg-white/12 px-2 py-1 text-xs font-black uppercase tracking-[0.08em] text-white">
        {value}
      </span>
    </div>
  );
}

function AccountDatum({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-black uppercase tracking-[0.12em] text-walnut/50">{label}</dt>
      <dd className="mt-1 break-words font-semibold leading-6 text-ink">{value}</dd>
    </div>
  );
}

function InviteFriendCard({ inviterName }: { inviterName: string }) {
  const [friendEmail, setFriendEmail] = useState("");
  const [copied, setCopied] = useState(false);
  const [siteUrl, setSiteUrl] = useState(process.env.NEXT_PUBLIC_SITE_URL || "https://meepletavern.com");
  const email = friendEmail.trim();
  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const inviteUrl = `${siteUrl.replace(/\/+$/, "")}/auth?mode=register`;
  const subject = "Te invito a MeepleTavern";
  const body = [
    `¡Hola! ${inviterName} te invita a entrar en MeepleTavern.`,
    "",
    "Puedes crear tu cuenta aquí:",
    inviteUrl
  ].join("\n");
  const mailtoHref = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  useEffect(() => {
    if (typeof window !== "undefined") {
      setSiteUrl(window.location.origin);
    }
  }, []);

  async function copyInviteLink() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="tavern-card p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <Mail size={20} className="text-ember" />
        <div>
          <p className="tavern-eyebrow">Invitar</p>
          <h2 className="font-display mt-1 text-2xl font-bold text-wood">Invita a un amigo</h2>
        </div>
      </div>

      <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-walnut/65">
        Escribe su email y le abrimos una invitación básica para registrarse en MeepleTavern.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <input
          type="email"
          value={friendEmail}
          onChange={(event) => setFriendEmail(event.target.value)}
          placeholder="amigo@email.com"
          className="field-input"
          inputMode="email"
          autoComplete="email"
        />
        <a
          href={emailIsValid ? mailtoHref : undefined}
          className={`button-primary ${emailIsValid ? "" : "pointer-events-none opacity-50"}`}
        >
          <Mail size={17} />
          Enviar invitación
        </a>
      </div>

      {friendEmail && !emailIsValid ? (
        <p className="mt-2 text-xs font-semibold text-ruby">Escribe un email válido para preparar la invitación.</p>
      ) : (
        <p className="mt-2 text-xs font-semibold text-walnut/55">
          Se abrirá tu app de correo con el email del amigo y el enlace ya preparados.
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-3">
        <button type="button" className="button-secondary" onClick={() => void copyInviteLink()}>
          <Copy size={17} />
          {copied ? "Enlace copiado" : "Copiar enlace"}
        </button>
        <span className="min-w-0 break-all text-xs font-semibold text-walnut/55">{inviteUrl}</span>
      </div>
    </section>
  );
}
