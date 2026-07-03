import Link from "next/link";
import Image from "next/image";
import { getCategoryTerms, getPopularGames, termHref } from "@/lib/catalog";
import { siteConfig } from "@/lib/site";

export async function PublicFooter() {
  const [categoryTerms, popularGames] = await Promise.all([getCategoryTerms(), getPopularGames(5)]);

  return (
    <footer className="tavern-footer text-white">
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
          <p className="mt-4 max-w-sm text-sm font-medium leading-6 text-parchment/78">
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
            href: termHref("category", term),
            label: term
          }))}
        />
        <FooterColumn
          title="Juegos populares"
          links={popularGames.map((game) => ({
            href: `/juegos/${game.slug}`,
            label: game.title
          }))}
        />
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: Array<{ href: string; label: string }> }) {
  return (
    <div className="rounded-md border border-white/0 p-1 md:pt-3">
      <h3 className="tavern-eyebrow text-ember">{title}</h3>
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
