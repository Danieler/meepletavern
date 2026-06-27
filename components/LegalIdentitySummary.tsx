import { getLegalIdentity } from "@/lib/legal";

export function LegalIdentitySummary({ title = "Responsable del servicio" }: { title?: string }) {
  const identity = getLegalIdentity();

  return (
    <section>
      <h2>{title}</h2>
      <div className="mt-4">
        <table className="w-full table-fixed border-collapse text-left text-sm">
          <tbody>
            <LegalIdentityRow label="Titular" value={identity.ownerName} />
            <LegalIdentityRow
              label="Email de contacto"
              value={identity.contactEmail}
              href={identity.contactEmail ? `mailto:${identity.contactEmail}` : undefined}
            />
            {identity.registryDetails ? (
              <LegalIdentityRow label="Datos registrales" value={identity.registryDetails} />
            ) : null}
          </tbody>
        </table>
      </div>
      {!identity.isComplete ? (
        <p className="mt-3 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm font-bold text-wood">
          Pendiente de configurar: {identity.missingFields.join(", ")}. Añade estos datos en las
          variables LEGAL_OWNER_NAME y LEGAL_CONTACT_EMAIL antes de publicar la web.
        </p>
      ) : null}
    </section>
  );
}

function LegalIdentityRow({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <tr className="border-b border-ink/10 last:border-b-0">
      <th className="w-[38%] p-3 align-top font-black text-ink sm:w-44">{label}</th>
      <td className="break-words p-3 align-top">
        {value ? (
          href ? <a href={href}>{value}</a> : value
        ) : (
          <span className="font-bold text-ruby">Pendiente de configurar</span>
        )}
      </td>
    </tr>
  );
}
