"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Critical global error:", error);
  }, [error]);

  return (
    <html lang="es">
      <body className="bg-paper min-h-screen font-sans flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-4xl font-black text-wood mb-4">
          Error Crítico
        </h1>
        <p className="text-lg text-walnut/80 mb-8 max-w-lg mx-auto">
          La taberna ha sufrido un problema grave de conexión. Intenta recargar la página.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button 
            onClick={() => reset()} 
            className="rounded-full bg-wood px-6 py-2.5 font-bold text-white shadow-sm transition hover:bg-wood/90"
          >
            Intentar de nuevo
          </button>
          <Link 
            href="/" 
            className="rounded-full bg-walnut/10 px-6 py-2.5 font-bold text-wood transition hover:bg-walnut/20"
          >
            Volver al inicio
          </Link>
        </div>
      </body>
    </html>
  );
}
