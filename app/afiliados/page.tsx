import type { Metadata } from "next";
import { LegalDocument } from "@/components/LegalDocument";

export const metadata: Metadata = {
  title: "Transparencia sobre enlaces de afiliados",
  description: "Cómo funcionan los posibles enlaces de afiliados de MeepleTavern."
};

export default function AffiliatesPage() {
  return (
    <LegalDocument
      eyebrow="Transparencia comercial"
      title="Enlaces de afiliados"
      intro="Qué ocurre cuando visitas una tienda desde MeepleTavern."
    >
      <section>
        <h2>Cómo funcionan</h2>
        <p className="mt-3">
          Algunos enlaces de compra pueden ser enlaces de afiliado. Si visitas una tienda desde uno
          de ellos y acabas comprando, MeepleTavern podría recibir una comisión. El precio que pagas
          no aumenta por ello. No todos los enlaces externos tienen necesariamente carácter afiliado.
        </p>
      </section>

      <section>
        <h2>Criterio editorial</h2>
        <p className="mt-3">
          Una posible comisión no determina las puntuaciones, reseñas o rankings. La intención es
          ordenar y explicar la información con criterios útiles para quien juega. Cuando exista una
          relación patrocinada distinta de un simple enlace de afiliado, se identificará de forma
          visible en el contenido correspondiente.
        </p>
      </section>

      <section>
        <h2>Precios, stock y compra</h2>
        <p className="mt-3">
          Los precios y la disponibilidad pueden cambiar. Antes de comprar, comprueba siempre la
          información final en la tienda. El contrato, pago, envío, devolución, garantía y atención
          posventa corresponden al comercio elegido, según sus propias condiciones.
        </p>
      </section>
    </LegalDocument>
  );
}
