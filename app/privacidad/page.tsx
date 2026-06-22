import type { Metadata } from "next";
import { LegalDocument, LegalIdentityBlock } from "@/components/LegalDocument";
import { getLegalIdentity } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description: "Cómo trata MeepleTavern los datos personales de sus usuarios."
};

export default function PrivacyPage() {
  const identity = getLegalIdentity();

  return (
    <LegalDocument
      eyebrow="Tus datos"
      title="Política de privacidad"
      intro="Qué datos usamos, para qué, durante cuánto tiempo y cómo puedes ejercer tus derechos."
    >
      <section>
        <h2>Responsable del tratamiento</h2>
        <div className="mt-4">
          <LegalIdentityBlock />
        </div>
      </section>

      <section>
        <h2>Datos que tratamos</h2>
        <ul className="mt-3">
          <li><strong>Cuenta:</strong> email, identificador de usuario y datos necesarios para autenticarte. La contraseña es gestionada por el proveedor de autenticación y MeepleTavern no puede verla.</li>
          <li><strong>Perfil:</strong> nombre visible, alias, biografía, avatar y preferencias de visibilidad.</li>
          <li><strong>Uso y contenido:</strong> ludoteca, listas, valoraciones, reseñas, comentarios, sugerencias y actividad que decidas realizar.</li>
          <li><strong>Datos técnicos:</strong> dirección IP, navegador, dispositivo, registros de seguridad y datos imprescindibles para mantener la sesión y prevenir abusos.</li>
        </ul>
      </section>

      <section>
        <h2>Finalidades y bases jurídicas</h2>
        <ul className="mt-3">
          <li><strong>Crear y gestionar tu cuenta y prestar el servicio:</strong> ejecución de las condiciones de uso.</li>
          <li><strong>Publicar tu perfil y aportaciones cuando los marcas como públicos:</strong> ejecución del servicio solicitado por ti. Puedes cambiar su visibilidad o eliminarlos cuando la función lo permita.</li>
          <li><strong>Proteger la plataforma, prevenir fraude y moderar abusos:</strong> interés legítimo en mantener un servicio seguro, ponderado frente a tus derechos.</li>
          <li><strong>Atender solicitudes y cumplir obligaciones legales:</strong> cumplimiento de obligaciones legales e interés legítimo en responder y defender reclamaciones.</li>
        </ul>
        <p className="mt-3">MeepleTavern no utiliza tus datos para enviarte publicidad por email ni adopta decisiones automatizadas con efectos jurídicos.</p>
        <p className="mt-3">
          Si se incorpora analítica opcional, su base será tu consentimiento. Permanecerá desactivada
          hasta que la aceptes y podrás retirar esa elección desde la política de cookies.
        </p>
      </section>

      <section>
        <h2>Quién puede recibir los datos</h2>
        <p className="mt-3">
          Acceden a los datos los proveedores necesarios para operar la web, bajo las garantías y
          contratos exigibles: alojamiento, base de datos, autenticación y almacenamiento. En la
          configuración actual, Supabase presta servicios de autenticación y almacenamiento de
          perfiles o avatares; Vercel presta alojamiento y, solo si lo aceptas, Web Analytics.
          También podrán comunicarse datos a autoridades cuando exista una obligación legal.
        </p>
        <p className="mt-3">
          Algunos proveedores pueden tratar datos fuera del Espacio Económico Europeo. Cuando
          ocurra, se aplicará una decisión de adecuación, cláusulas contractuales tipo u otra
          garantía válida conforme al RGPD. Las imágenes o vídeos alojados por terceros pueden
          comunicar a ese proveedor datos técnicos como la IP al cargarse; los vídeos de YouTube
          solo se cargan después de que pulses el botón correspondiente.
        </p>
      </section>

      <section>
        <h2>Conservación</h2>
        <p className="mt-3">
          Los datos de cuenta y perfil se conservan mientras mantengas la cuenta. Las aportaciones
          se conservan hasta que las elimines, cierres la cuenta o deban retirarse por moderación.
          Después, los datos imprescindibles podrán quedar bloqueados durante los plazos legales
          para atender responsabilidades. Los registros técnicos y copias de seguridad se conservan
          durante periodos limitados definidos por seguridad y por los proveedores del servicio.
          En Vercel Web Analytics, el identificador hash se reinicia cada día y las estadísticas
          agregadas se conservan durante la ventana de informes del plan contratado.
        </p>
      </section>

      <section>
        <h2>Tus derechos</h2>
        <p className="mt-3">
          Puedes solicitar acceso, rectificación, supresión, oposición, limitación y portabilidad,
          así como retirar un consentimiento cuando esa sea la base del tratamiento. Escribe a {identity.contactEmail ? <a href={`mailto:${identity.contactEmail}`}>{identity.contactEmail}</a> : "la dirección de contacto del responsable"} e indica qué derecho deseas ejercer; podremos pedirte información razonable para verificar tu identidad.
        </p>
        <p className="mt-3">
          Si consideras que tus datos no se han tratado correctamente, puedes reclamar ante la{" "}
          <a href="https://www.aepd.es/" rel="noopener noreferrer" target="_blank">Agencia Española de Protección de Datos</a>.
        </p>
      </section>

      <section>
        <h2>Menores</h2>
        <p className="mt-3">
          El servicio no está dirigido a menores de 14 años. Si tienes menos de 14 años, no crees
          una cuenta ni envíes datos personales sin la autorización de quien ejerza tu patria
          potestad o tutela. Si detectamos una cuenta creada incumpliendo esta regla, podremos
          suspenderla y eliminar sus datos.
        </p>
      </section>
    </LegalDocument>
  );
}
