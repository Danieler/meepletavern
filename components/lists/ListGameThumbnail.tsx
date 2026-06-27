import Image from "next/image";
import type { GameImageStatus } from "@prisma/client";

type ListGameThumbnailProps = {
  title: string;
  coverImageUrl: string | null;
  coverImageAlt: string;
  imageStatus: GameImageStatus;
  size?: number;
};

export function ListGameThumbnail({
  title,
  coverImageUrl,
  coverImageAlt,
  imageStatus,
  size = 64
}: ListGameThumbnailProps) {
  const canShowImage = imageStatus === "verified" && Boolean(coverImageUrl);

  return (
    <span
      className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-walnut/12 bg-wood text-center text-white shadow-sm"
      style={{ width: size, height: size }}
    >
      {canShowImage ? (
        <Image
          src={coverImageUrl || ""}
          alt={coverImageAlt.trim() || `Portada de ${title}`}
          fill
          sizes={`${size}px`}
          className="object-cover"
          unoptimized
        />
      ) : (
        <span className="px-2 text-[10px] font-black uppercase leading-tight tracking-wide text-parchment/80">
          {title.slice(0, 22)}
        </span>
      )}
    </span>
  );
}
