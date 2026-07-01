"use client";

import { Bookmark, Star, MessageSquareText } from "lucide-react";
import { AuthCtaButton } from "@/components/auth-cta/AuthCtaButton";
import { useAuth } from "@/hooks/useAuth";

type ReviewSignupCtaProps = {
  variant?: "inline" | "fullwidth";
  className?: string;
};

const benefits = [
  {
    icon: Bookmark,
    title: "Guarda reseñas",
    description: "Marca las reseñas que te interesan y recupéralas cuando decidas tu próxima compra."
  },
  {
    icon: Star,
    title: "Opina y puntúa",
    description: "Deja tu valoración en cada juego y ayuda a otros jugadores a decidir."
  },
  {
    icon: MessageSquareText,
    title: "Escribe reseñas",
    description: "Comparte tu experiencia de mesa y conviértete en voz de la comunidad."
  }
];

export function ReviewSignupCta({ variant = "inline", className = "" }: ReviewSignupCtaProps) {
  const { user, loading } = useAuth();

  if (loading || user) {
    return null;
  }

  if (variant === "inline") {
    return (
      <section className={`review-signup-cta p-5 sm:p-6 ${className}`}>
        <div className="relative grid gap-4 md:grid-cols-[minmax(0,1fr)_220px] md:items-center">
          <div>
            <p className="text-[11px] font-black uppercase leading-4 tracking-[0.14em] text-[#eab35c]">
              Tu opinión importa
            </p>
            <h2 className="font-display mt-2 text-xl font-bold leading-tight text-white sm:text-2xl">
              Guarda lo que lees, opina sobre lo que juegas
            </h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-parchment/72">
              Crea tu cuenta gratuita y empieza a guardar reseñas, valorar juegos y compartir tus impresiones de mesa.
            </p>
          </div>
          <AuthCtaButton
            context="review"
            variant="primary"
            className="justify-center"
            intent="review_game"
          >
            Crear cuenta gratis
          </AuthCtaButton>
        </div>
      </section>
    );
  }

  return (
    <section className={`review-signup-cta p-6 sm:p-8 lg:p-10 ${className}`}>
      <div className="relative mx-auto max-w-4xl text-center">
        <p className="text-[11px] font-black uppercase leading-4 tracking-[0.14em] text-[#eab35c]">
          Únete a la comunidad
        </p>
        <h2 className="font-display mt-3 text-2xl font-bold leading-tight text-white sm:text-3xl lg:text-4xl">
          Convierte cada reseña en tu próxima partida
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-base font-medium leading-7 text-parchment/78">
          Guarda las reseñas que te interesan, deja tus propias opiniones y construye tu ludoteca ideal con recomendaciones personalizadas.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {benefits.map((benefit) => (
            <div
              key={benefit.title}
              className="rounded-md border border-white/10 bg-white/5 p-4 text-left backdrop-blur"
            >
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-[#eab35c]/15 text-[#eab35c]">
                <benefit.icon size={20} strokeWidth={2.1} />
              </div>
              <h3 className="mt-3 text-sm font-black text-white">{benefit.title}</h3>
              <p className="mt-1.5 text-xs font-semibold leading-5 text-parchment/65">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <AuthCtaButton
            context="review"
            variant="hero-primary"
            intent="review_game"
          >
            Crear cuenta gratis
          </AuthCtaButton>
          <p className="text-xs font-semibold text-parchment/50">
            Sin coste · Sin spam · Cancela cuando quieras
          </p>
        </div>
      </div>
    </section>
  );
}
