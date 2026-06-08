"use client";

import { useEffect, useState } from "react";
import { Dice5 } from "lucide-react";
import {
  getGameCoverAlt,
  hasVerifiedCoverImage,
  type GameImageFields
} from "@/lib/gameImages";

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
    <div className={`relative overflow-hidden rounded-md bg-ink/5 ${variantClasses[variant]} ${className}`}>
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
        <MeepleTavernCoverPlaceholder gameTitle={gameTitle} showLabel={showPlaceholderLabel} />
      )}
    </div>
  );
}

function MeepleTavernCoverPlaceholder({
  gameTitle,
  showLabel
}: {
  gameTitle: string;
  showLabel: boolean;
}) {
  return (
    <div
      role="img"
      aria-label={`Portada pendiente de ${gameTitle}`}
      className="relative flex h-full min-h-full w-full flex-col justify-between overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(233,177,91,0.36),transparent_36%),linear-gradient(135deg,#1d2530_0%,#2f6f62_52%,#8f3048_100%)] p-4 text-white"
    >
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(180deg,transparent,rgba(29,37,48,0.72))]" />
      <div className="relative flex items-center justify-between gap-3">
        <span className="rounded-md bg-white/12 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-parchment">
          MeepleTavern
        </span>
        <Dice5 size={20} aria-hidden="true" className="text-ember" />
      </div>
      <div className="relative mx-auto my-4 flex w-20 max-w-[42%] flex-col items-center">
        <span className="h-8 w-8 rounded-full bg-ember shadow-soft" />
        <span className="-mt-1 h-14 w-14 rounded-t-2xl bg-parchment shadow-soft" />
        <span className="-mt-1 h-5 w-20 rounded-md bg-ember/90 shadow-soft" />
      </div>
      <div className="relative">
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
