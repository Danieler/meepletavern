"use client";

import { useEffect } from "react";
import Link from "next/link";
import { PublicShell } from "@/components/PublicShell";

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
    <PublicShell>
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
    </PublicShell>
  );
}
