import Link from "next/link";
import { PublicShell } from "@/components/PublicShell";
import { getLegalIdentity } from "@/lib/legal";
import { LEGAL_UPDATED_AT } from "@/lib/legalConstants";

const legalLinks = [
  { href: "/aviso-legal", label: "Aviso legal" },
  { href: "/privacidad", label: "Privacidad" },
  { href: "/cookies", label: "Cookies" },
  { href: "/afiliados", label: "Afiliados" }
];

export function LegalDocument({
  eyebrow,
  title,
  intro,
  children
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  const legalIdentity = getLegalIdentity();

  return (
    <PublicShell>
      <main>
        <section className="page-hero">
          <div className="container-page">
            <p className="tavern-eyebrow">{eyebrow}</p>
            <h1 className="page-hero-title">{title}</h1>
            <p className="page-hero-copy">{intro}</p>
          </div>
        </section>

        <section className="container-page py-10 sm:py-14">
          <nav aria-label="Documentos legales" className="mb-6 flex flex-wrap gap-2">
            {legalLinks.map((link) => (
              <Link key={link.href} className="button-secondary min-h-10 px-4 py-2" href={link.href}>
                {link.label}
              </Link>
            ))}
          </nav>

          {!legalIdentity.isComplete ? (
            <div className="mb-6 rounded-md border border-ember/35 bg-ember/10 px-4 py-3 text-sm font-semibold leading-6 text-wood">
              <strong>Configuración pendiente:</strong> antes de publicar la web hay que completar en
              el entorno {legalIdentity.missingFields.join(", ")}.
            </div>
          ) : null}

          <article className="tavern-panel mx-auto max-w-4xl space-y-8 p-5 text-[15px] leading-7 text-ink/75 sm:p-8 [&_a]:font-bold [&_a]:text-wood [&_a]:underline [&_a]:decoration-ember/50 [&_a]:underline-offset-4 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-wood [&_li]:pl-1 [&_strong]:text-ink [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-2">
            {children}
            <p className="border-t border-ink/10 pt-5 text-sm text-ink/55">
              Última actualización: {LEGAL_UPDATED_AT}.
            </p>
          </article>
        </section>
      </main>
    </PublicShell>
  );
}

export function LegalIdentityBlock() {
  const identity = getLegalIdentity();

  return (
    <dl className="grid gap-2 rounded-md border border-ink/10 bg-white/55 p-4 sm:grid-cols-[170px_1fr]">
      <dt className="font-bold text-ink">Titular</dt>
      <dd>{identity.ownerName || "Pendiente de configurar"}</dd>
      <dt className="font-bold text-ink">NIF/CIF</dt>
      <dd>{identity.taxId || "Pendiente de configurar"}</dd>
      <dt className="font-bold text-ink">Domicilio</dt>
      <dd>{identity.postalAddress || "Pendiente de configurar"}</dd>
      <dt className="font-bold text-ink">Contacto</dt>
      <dd>
        {identity.contactEmail ? (
          <a href={`mailto:${identity.contactEmail}`}>{identity.contactEmail}</a>
        ) : (
          "Pendiente de configurar"
        )}
      </dd>
      {identity.registryDetails ? (
        <>
          <dt className="font-bold text-ink">Datos registrales</dt>
          <dd>{identity.registryDetails}</dd>
        </>
      ) : null}
    </dl>
  );
}
