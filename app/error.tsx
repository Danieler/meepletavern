"use client";

import { useEffect } from "react";
import Link from "next/link";
import { PublicHeader } from "@/components/PublicHeader";
import { FeedbackButton } from "@/components/FeedbackButton";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Unhandled application error:", error);
  }, [error]);

  return (
    <>
      <PublicHeader />
      <main className="container-page py-16 text-center">
        <h1 className="text-4xl font-display font-black text-wood mb-4">
          Ocurrió un error inesperado
        </h1>
        <p className="text-lg text-walnut/80 mb-8 max-w-lg mx-auto">
          La taberna ha tenido un problema procesando tu petición. El cantinero ya está avisado y estamos limpiando el desastre.
        </p>
        <div className="flex items-center justify-center gap-4">
          <button onClick={() => reset()} className="button-primary">
            Intentar de nuevo
          </button>
          <Link href="/" className="button-secondary">
            Volver al inicio
          </Link>
        </div>
      </main>
      <FeedbackButton />
      <footer className="tavern-footer text-white">
        <div className="container-page py-10 text-center text-sm text-parchment/60">
          <p>© {new Date().getFullYear()} MeepleTavern. Todos los derechos reservados.</p>
        </div>
      </footer>
    </>
  );
}
