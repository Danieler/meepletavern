import Image from "next/image";

type UserAvatarProps = {
  src?: string | null;
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  editable?: boolean;
};

const sizeClasses = {
  sm: "h-12 w-12 text-base",
  md: "h-16 w-16 text-xl",
  lg: "h-24 w-24 text-3xl",
  xl: "h-32 w-32 text-5xl"
};

const sizePixels = {
  sm: 48,
  md: 64,
  lg: 96,
  xl: 128
};

export function UserAvatar({ src, name, size = "md", className = "", editable = false }: UserAvatarProps) {
  const label = name.trim() || "Usuario";
  const isPreviewUrl = src?.startsWith("blob:") || src?.startsWith("data:");

  const avatarContent = (
    <>
      {src && isPreviewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={label} className="h-full w-full object-cover" />
      ) : src ? (
        <Image src={src} alt={label} fill sizes={`${sizePixels[size]}px`} className="object-cover" />
      ) : (
        <UserAvatarFallbackArt seed={label} className="h-full w-full" />
      )}
      {editable && !src && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 text-white opacity-0 transition-opacity hover:opacity-100 group-hover:opacity-100">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-1">
            <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
            <circle cx="12" cy="13" r="3"/>
          </svg>
          <span className="text-[10px] font-bold uppercase tracking-wider">Subir foto</span>
        </div>
      )}
    </>
  );

  const containerClasses = `group relative flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-walnut/15 bg-paper shadow-sm ${sizeClasses[size]} ${className}`;

  if (editable && !src) {
    // We use an anchor tag to ensure a hard navigation, or a Link to nextjs routing.
    // Given the ProfilePanel uses next/link, we'll use a normal anchor for simplicity or require next/link.
    return (
      <a href="/mi-perfil/ajustes" className={containerClasses} title="Subir foto de perfil">
        {avatarContent}
      </a>
    );
  }

  return (
    <div className={containerClasses}>
      {avatarContent}
    </div>
  );
}

export function UserAvatarFallbackArt({
  seed,
  className = ""
}: {
  seed: string;
  className?: string;
}) {
  const variant = Math.abs(hashSeed(seed)) % 3;

  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="64" height="64" rx="12" fill={variant === 0 ? "#f8e6c1" : variant === 1 ? "#f1d2a4" : "#ead9bb"} />
      {variant === 0 ? <MeepleFace /> : variant === 1 ? <MeepleShape /> : <TavernKeeper />}
    </svg>
  );
}

function MeepleFace() {
  return (
    <>
      <circle cx="32" cy="24" r="13" fill="#8b5e3c" />
      <circle cx="27" cy="23" r="1.8" fill="#fffaf0" />
      <circle cx="37" cy="23" r="1.8" fill="#fffaf0" />
      <path d="M26 29c2.2 2.8 9.8 2.8 12 0" fill="none" stroke="#fffaf0" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M18 56c0-8.8 6.3-16 14-16s14 7.2 14 16" fill="#c9773b" />
    </>
  );
}

function MeepleShape() {
  return (
    <path
      d="M21 14c0 3.9-2.9 7-6.5 7S8 17.9 8 14s2.9-7 6.5-7 6.5 3.1 6.5 7Zm35 0c0 3.9-2.9 7-6.5 7S43 17.9 43 14s2.9-7 6.5-7 6.5 3.1 6.5 7ZM32 9.5c5 0 9 4 9 9 0 3.4-1.9 6.4-4.7 7.9l7 18.4c1.1 2.9-1 6.2-4.2 6.2h-2.6c-1.8 0-3.4-1.1-4-2.8L32 43.8l-1.5 4.4c-.6 1.7-2.2 2.8-4 2.8h-2.6c-3.2 0-5.3-3.2-4.2-6.2l7-18.4A9 9 0 0 1 23 18.5c0-5 4-9 9-9Z"
      fill="#9b6a43"
    />
  );
}

function TavernKeeper() {
  return (
    <>
      <path d="M17 24c0-8.3 6.7-15 15-15s15 6.7 15 15v2H17v-2Z" fill="#6f4a2d" />
      <circle cx="32" cy="28" r="12.5" fill="#d8a979" />
      <path d="M23 20h18c-1.4-4.7-5.3-8-9-8s-7.6 3.3-9 8Z" fill="#4f3521" />
      <circle cx="27.5" cy="28" r="1.8" fill="#3d2818" />
      <circle cx="36.5" cy="28" r="1.8" fill="#3d2818" />
      <path d="M27 33.5c1.8 1.8 8.2 1.8 10 0" fill="none" stroke="#3d2818" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M18 56c0-7.7 6.3-14 14-14s14 6.3 14 14" fill="#7f9a4f" />
    </>
  );
}

function hashSeed(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return hash;
}
