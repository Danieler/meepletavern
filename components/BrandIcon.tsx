export type BrandIconName =
  | "book"
  | "bookmark"
  | "building"
  | "calendar"
  | "chat"
  | "clock"
  | "crown"
  | "dice"
  | "document"
  | "flame"
  | "gauge"
  | "grid"
  | "meeple"
  | "search"
  | "settings"
  | "sliders"
  | "star"
  | "tag"
  | "trophy"
  | "user"
  | "users";

type BrandIconProps = {
  name: BrandIconName;
  size?: number;
  className?: string;
  "aria-hidden"?: boolean;
};

export function BrandIcon({
  name,
  size = 20,
  className = "",
  "aria-hidden": ariaHidden = true
}: BrandIconProps) {
  return (
    <img
      src={`/icons/${name}.png`}
      alt=""
      aria-hidden={ariaHidden}
      width={size}
      height={size}
      className={`inline-block shrink-0 object-contain ${className}`}
      loading="lazy"
      decoding="async"
    />
  );
}
