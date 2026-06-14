import Link from "next/link";
import Image from "next/image";
import { getCategoryTerms, getPopularGames } from "@/lib/catalog";
import { siteConfig } from "@/lib/site";

export async function PublicFooter() {
  const [categoryTerms, popularGames] = await Promise.all([getCategoryTerms(), getPopularGames(5)]);

  return (
    <footer className="wood-surface border-t border-ember/30 text-white">
      <div className="container-page grid gap-8 py-10 md:grid-cols-[1.2fr_1fr_1fr_1fr]">
        <div>
          <div className="relative h-14 w-44">
            <Image
              src={siteConfig.logoImage}
              alt={siteConfig.name}
              fill
              sizes="176px"
              className="object-contain object-left"
            />
          </div>
          <p className="mt-4 text-sm leading-6 text-parchment/72">
            Una taberna digital para descubrir juegos de mesa, comparar reseñas, explorar rankings
            y encontrar la próxima partida con criterio.
          </p>
        </div>
        <FooterColumn
          title="MeepleTavern"
          links={[
            { href: "/categorias", label: "Sobre MeepleTavern" },
            { href: "/resenas", label: "Contacto" },
            { href: "/rankings", label: "Privacidad" },
            { href: "/juegos", label: "Afiliados" }
          ]}
        />
        <FooterColumn
          title="Categorías populares"
          links={categoryTerms.slice(0, 5).map((term) => ({
            href: `/juegos?category=${encodeURIComponent(term)}`,
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
    <div>
      <h3 className="tavern-eyebrow">{title}</h3>
      <ul className="mt-4 space-y-2 text-sm text-parchment/70">
        {links.map((link) => (
          <li key={`${link.href}-${link.label}`}>
            <Link className="font-semibold transition hover:text-ember" href={link.href}>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
