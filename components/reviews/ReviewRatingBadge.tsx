type ReviewRatingBadgeProps = {
  rating: number;
  size?: "sm" | "md" | "lg" | "hero";
  tone?: "light" | "dark";
  className?: string;
};

export function ReviewRatingBadge({
  rating,
  size = "md",
  tone = "light",
  className = ""
}: ReviewRatingBadgeProps) {
  const sizeClass =
    size === "hero"
      ? "h-28 w-28 text-5xl"
      : size === "lg"
        ? "h-24 w-24 text-4xl"
        : size === "sm"
          ? "h-14 w-14 text-xl"
          : "h-[4.5rem] w-[4.5rem] text-3xl";
  const toneClass = tone === "dark"
    ? "border-[#eab35c] bg-[#2a160f] text-white"
    : "border-ember bg-walnut text-white";

  return (
    <div
      className={`${sizeClass} ${toneClass} inline-flex shrink-0 flex-col items-center justify-center rounded-full border-2 font-display font-black leading-none shadow-soft ${className}`}
      aria-label={`Nota MeepleTavern de la ficha: ${formatRating(rating)} sobre 10`}
    >
      <span>{formatRating(rating)}</span>
      <span className="mt-1 text-[10px] font-black uppercase leading-none tracking-[0.14em] text-ember">/10</span>
    </div>
  );
}

export function formatRating(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
