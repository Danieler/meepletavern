import type { Metadata } from "next";
import { LegalDocument } from "@/components/LegalDocument";
import { getLegalIdentity } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Aviso legal y condiciones de uso",
  description: "Información del titular y condiciones de uso de MeepleTavern."
};

export default function LegalNoticePage() {
  const identity = getLegalIdentity();

  return (
    <LegalDocument
      eyebrow="Información del sitio"
      title="Aviso legal y condiciones de uso"
      intro="Las reglas básicas para usar MeepleTavern y saber quién está detrás del servicio."
    >
      <section>
        <h2>Qué ofrece MeepleTavern</h2>
        <p className="mt-3">
          MeepleTavern es un servicio informativo y comunitario sobre juegos de mesa: catálogo,
          reseñas, rankings, perfiles, ludotecas, listas, valoraciones, comentarios y actividad de
          la comunidad. MeepleTavern no vende directamente los productos enlazados ni forma parte
          de los contratos que el usuario pueda celebrar con una tienda externa.
        </p>
      </section>

      <section>
        <h2>Uso responsable y contenido de la comunidad</h2>
        <p className="mt-3">Al utilizar el servicio te comprometes a:</p>
        <ul className="mt-3">
          <li>No publicar contenido ilegal, engañoso, discriminatorio, acosador o que vulnere derechos de terceros.</li>
          <li>No suplantar identidades, manipular valoraciones ni intentar dañar o saturar el servicio.</li>
          <li>Publicar únicamente textos e imágenes que puedas compartir legítimamente.</li>
        </ul>
        <p className="mt-3">
          Conservas los derechos sobre lo que publicas. Al hacerlo con visibilidad pública concedes
          al titular una licencia no exclusiva y gratuita, limitada a alojarlo, reproducirlo y
          mostrarlo dentro de MeepleTavern mientras siga publicado. El titular podrá retirar o
          limitar contenido y cuentas cuando sea necesario para cumplir la ley, proteger a la
          comunidad o aplicar estas condiciones.
        </p>
      </section>

      <section id="contacto">
        <h2>Contacto, incidencias y reclamaciones</h2>
        <p className="mt-3">
          Para comunicar contenido ilícito, una vulneración de derechos, una incidencia o una
          reclamación, escribe a {identity.contactEmail ? <a href={`mailto:${identity.contactEmail}`}>{identity.contactEmail}</a> : "la dirección de contacto indicada en esta página"}. Incluye la URL afectada, una explicación y, cuando proceda, la acreditación de tus derechos.
        </p>
      </section>

      <section>
        <h2>Propiedad intelectual y enlaces externos</h2>
        <p className="mt-3">
          La marca, el diseño y los contenidos propios de MeepleTavern están protegidos por la
          normativa aplicable. Las marcas, portadas, vídeos y demás materiales de terceros
          pertenecen a sus respectivos titulares y se utilizan con fines informativos o mediante
          enlace. Los sitios externos gestionan sus propios contenidos, precios, disponibilidad,
          privacidad y condiciones de compra.
        </p>
      </section>

      <section>
        <h2>Disponibilidad y responsabilidad</h2>
        <p className="mt-3">
          Se procura mantener la información actualizada y el servicio disponible, pero no se
          garantiza que precios, stock, fichas o aportaciones de usuarios estén libres de errores.
          Nada de lo indicado limita los derechos irrenunciables que correspondan a consumidores y
          usuarios conforme a la ley aplicable.
        </p>
      </section>
    </LegalDocument>
  );
}
