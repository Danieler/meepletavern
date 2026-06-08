type RatingBadgeProps = {
  rating: number;
  size?: "sm" | "md" | "lg";
};

export function RatingBadge({ rating, size = "md" }: RatingBadgeProps) {
  const sizeClass =
    size === "lg" ? "h-20 w-20 text-2xl" : size === "sm" ? "h-12 w-12 text-base" : "h-16 w-16 text-xl";

  return (
    <div
      className={`${sizeClass} inline-flex shrink-0 flex-col items-center justify-center rounded-md bg-ink font-black text-white shadow-soft`}
      aria-label={`Puntuación ${rating.toFixed(1)} sobre 10`}
    >
      <span>{rating.toFixed(1)}</span>
      <span className="text-[10px] font-bold uppercase text-parchment">MT</span>
    </div>
  );
}

