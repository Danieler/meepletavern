"use client";

import Link from "next/link";
import { ArrowRight, Dices, LibraryBig, LockKeyhole, UsersRound } from "lucide-react";
import { AuthCtaButton } from "@/components/auth-cta/AuthCtaButton";
import { useAuth } from "@/hooks/useAuth";

const benefits = [
  {
    icon: UsersRound,
    title: "Invita a tu grupo",
    description: "Solo las personas que acepten podrán entrar y compartir su ludoteca."
  },
  {
    icon: LibraryBig,
    title: "Juntad vuestros juegos",
    description: "Veréis una sola colección y cuántas copias tenéis de cada juego."
  },
  {
    icon: Dices,
    title: "Guardad las partidas del grupo",
    description: "Se registran en la taberna sin modificar los contadores personales."
  }
] as const;

export function TavernDiscoveryCard() {
  const { user } = useAuth();

  return (
    <section className="container-page pt-7" aria-labelledby="discover-taverns-title">
      <div className="relative overflow-hidden rounded-lg border border-ember/25 bg-wood text-white shadow-tavern">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_0%,rgba(201,130,31,0.32),transparent_26rem),linear-gradient(135deg,rgba(54,32,22,0.98),rgba(31,31,31,0.98)_65%)]" />
        <div className="relative grid gap-7 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.9fr)] lg:items-center">
          <div>
            <p className="tavern-eyebrow text-ember">Tabernas privadas</p>
            <h2 id="discover-taverns-title" className="font-display mt-2 max-w-2xl text-3xl font-bold leading-tight sm:text-4xl">
              La ludoteca de todo el grupo, en un solo sitio
            </h2>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-parchment/78 sm:text-base">
              Una taberna es el espacio privado de tu grupo de juego. Reúne automáticamente los juegos que cada miembro tiene “En casa” y os ayuda a decidir qué sacar a mesa.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              {user ? (
                <Link className="button-primary" href="/comunidad/tabernas">
                  Abrir mis tabernas <ArrowRight size={17} />
                </Link>
              ) : (
                <AuthCtaButton context="tavern" next="/comunidad/tabernas">
                  Crear una taberna <ArrowRight size={17} />
                </AuthCtaButton>
              )}
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-parchment/60">
                <LockKeyhole size={14} /> Solo para miembros invitados
              </span>
            </div>
          </div>

          <ol className="grid gap-3" aria-label="Cómo funciona una taberna">
            {benefits.map(({ icon: Icon, title, description }, index) => (
              <li key={title} className="grid grid-cols-[38px_minmax(0,1fr)] gap-3 rounded-md border border-white/10 bg-white/7 p-3.5 backdrop-blur-sm">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-ember/15 text-ember" aria-hidden="true">
                  <Icon size={18} />
                </span>
                <div>
                  <p className="text-sm font-black text-white"><span className="mr-1 text-ember">{index + 1}.</span> {title}</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-parchment/65">{description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
