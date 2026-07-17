import Link from "next/link";
import Image from "next/image";
import { Amphora, Beer, Dices, Flame } from "lucide-react";
import { siteConfig } from "@/lib/site";
import { CANONICAL_CATEGORIES } from "@/lib/taxonomy";
import { slugify } from "@/lib/slug";

export async function PublicFooter() {
  const categoryTerms = CANONICAL_CATEGORIES.slice(0, 5);

  return (
    <footer className="tavern-footer text-white">
      <div className="footer-ornament footer-ornament-left" aria-hidden="true">
        <Flame className="footer-ornament-flame" size={25} strokeWidth={1.55} />
        <Beer size={58} strokeWidth={1.35} />
      </div>
      <div className="footer-ornament footer-ornament-right" aria-hidden="true">
        <Dices className="footer-ornament-dice" size={47} strokeWidth={1.35} />
        <Amphora size={70} strokeWidth={1.3} />
      </div>
      <div className="container-page grid gap-6 py-10 sm:py-12 md:grid-cols-[1.15fr_0.85fr_1fr_1fr] lg:gap-10">
        <div className="footer-brand-panel">
          <div className="footer-logo-plaque">
            <div className="relative h-12 w-44">
              <Image
                src={siteConfig.logoImage}
                alt={siteConfig.name}
                fill
                sizes="176px"
                className="object-contain object-left"
              />
            </div>
          </div>
          <p className="footer-brand-copy mt-4 max-w-sm text-sm font-medium leading-6 text-text-on-dark-muted">
            Una taberna digital para descubrir juegos de mesa, comparar reseñas, explorar rankings
            y encontrar la próxima partida con criterio.
          </p>
        </div>
        <FooterColumn
          title="MeepleTavern"
          links={[
            { href: "/aviso-legal", label: "Aviso legal" },
            { href: "/aviso-legal#contacto", label: "Contacto" },
            { href: "/privacidad", label: "Privacidad" },
            { href: "/cookies", label: "Cookies" }
          ]}
        />
        <FooterColumn
          title="Categorías populares"
          links={categoryTerms.slice(0, 5).map((term) => ({
            href: `/categorias/${slugify(term)}`,
            label: term
          }))}
        />
        <FooterColumn
          title="Explorar"
          links={[
            { href: "/juegos", label: "Catálogo de juegos" },
            { href: "/rankings", label: "Rankings" },
            { href: "/resenas", label: "Reseñas" },
            { href: "/comunidad", label: "Comunidad" },
            { href: "/mecanicas", label: "Mecánicas" }
          ]}
        />
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: Array<{ href: string; label: string }> }) {
  return (
    <div className="footer-column rounded-lg border border-transparent p-1 md:pt-3">
      <h3 className="footer-column-title tavern-eyebrow text-accent">{title}</h3>
      <ul className="mt-3 space-y-1.5 text-sm">
        {links.map((link) => (
          <li key={`${link.href}-${link.label}`}>
            <Link className="footer-link" href={link.href} prefetch={false}>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
