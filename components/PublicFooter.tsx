import Link from "next/link";
import { categoryTerms, catalogGames } from "@/lib/catalog";
import { siteConfig } from "@/lib/site";

export function PublicFooter() {
  const popularGames = catalogGames.slice(0, 5);

  return (
    <footer className="border-t border-ink/10 bg-ink text-white">
      <div className="container-page grid gap-8 py-10 md:grid-cols-[1.2fr_1fr_1fr_1fr]">
        <div>
          <h2 className="text-2xl font-black">{siteConfig.name}</h2>
          <p className="mt-4 text-sm leading-6 text-white/70">
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
      <h3 className="text-sm font-bold uppercase text-ember">{title}</h3>
      <ul className="mt-4 space-y-2 text-sm text-white/70">
        {links.map((link) => (
          <li key={`${link.href}-${link.label}`}>
            <Link className="hover:text-white" href={link.href}>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

