import Link from "next/link";

export function AdminReviewFormNotice() {
  return (
    <section className="rounded-md border border-ink/10 bg-white p-6 shadow-soft">
      <p className="text-sm font-semibold text-ink/65">
        Necesitas al menos un juego en el catálogo para crear una reseña.
      </p>
      <Link className="button-secondary mt-4 inline-flex" href="/admin/games">
        Ir a juegos
      </Link>
    </section>
  );
}
