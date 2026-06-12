"use client";

import { useEffect, useState } from "react";
import {
  getGameCoverAlt,
  hasVerifiedCoverImage,
  type GameImageFields
} from "@/lib/gameImages";
import { placeholderUrl, type PlaceholderKind } from "@/lib/mediaSafety";

type GameCoverImageProps = GameImageFields & {
  gameTitle: string;
  variant?: "card" | "detail" | "review" | "ranking";
  priority?: boolean;
  className?: string;
  showPlaceholderLabel?: boolean;
};

const variantClasses = {
  card: "aspect-[16/10]",
  detail: "aspect-[4/3]",
  review: "min-h-52 md:aspect-[4/3]",
  ranking: "aspect-[4/3]"
};

export function GameCoverImage({
  gameTitle,
  coverImageUrl,
  coverImageAlt,
  imageStatus,
  imageSourceName,
  imageSourceUrl,
  imageLicenseNote,
  placeholderKind,
  variant = "card",
  priority = false,
  className = "",
  showPlaceholderLabel = true
}: GameCoverImageProps) {
  const [failed, setFailed] = useState(false);
  const image = {
    coverImageUrl,
    coverImageAlt,
    imageSourceName,
    imageSourceUrl,
    imageLicenseNote,
    imageStatus
  };
  const showVerifiedCover = hasVerifiedCoverImage(image) && !failed;

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") {
      return;
    }

    if (imageStatus === "verified" && !coverImageUrl) {
      console.warn(`[MeepleTavern] ${gameTitle} is verified but has no coverImageUrl.`);
    }

    if (!coverImageAlt.trim()) {
      console.warn(`[MeepleTavern] ${gameTitle} has no coverImageAlt.`);
    }
  }, [coverImageAlt, coverImageUrl, gameTitle, imageStatus]);

  return (
    <div className={`relative w-full min-w-0 max-w-full overflow-hidden rounded-md bg-ink/5 ${variantClasses[variant]} ${className}`}>
      {showVerifiedCover ? (
        <img
          src={coverImageUrl || ""}
          alt={getGameCoverAlt(image, gameTitle)}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <MeepleTavernCoverPlaceholder
          gameTitle={gameTitle}
          kind={(placeholderKind || "general") as PlaceholderKind}
          showLabel={showPlaceholderLabel}
        />
      )}
    </div>
  );
}

function MeepleTavernCoverPlaceholder({
  gameTitle,
  kind,
  showLabel
}: {
  gameTitle: string;
  kind: PlaceholderKind;
  showLabel: boolean;
}) {
  return (
    <div
      role="img"
      aria-label={`Portada pendiente de ${gameTitle}`}
      className="relative h-full min-h-full w-full overflow-hidden bg-ink/5 text-white"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(217,137,43,0.22),transparent_46%),linear-gradient(135deg,rgba(50,18,6,0.95),rgba(90,58,36,0.92))]" />
      <img
        src={placeholderUrl(kind)}
        alt=""
        loading="lazy"
        decoding="async"
        className="absolute inset-0 m-auto h-3/4 w-3/4 object-contain opacity-80"
      />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(180deg,transparent,rgba(29,37,48,0.72))]" />
      <div className="absolute left-4 right-4 top-4 flex items-center justify-between gap-3">
        <span className="rounded-md bg-white/12 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-parchment">
          MeepleTavern
        </span>
        <span className="h-8 w-8 rounded-md bg-white/10 bg-[url('/brand/meepletavern-mark.png')] bg-contain bg-center bg-no-repeat" aria-hidden="true" />
      </div>
      <div className="absolute bottom-4 left-4 right-4">
        <p className="line-clamp-2 text-lg font-black leading-tight text-white">{gameTitle}</p>
        {showLabel ? (
          <p className="mt-2 inline-flex rounded-md bg-white/12 px-2 py-1 text-xs font-bold text-parchment">
            Imagen pendiente
          </p>
        ) : null}
      </div>
    </div>
  );
}
