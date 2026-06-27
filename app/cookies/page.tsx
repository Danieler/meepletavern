import type { Metadata } from "next";
import { CookiePreferencesButton } from "@/components/CookiePreferencesButton";
import { LegalDocument } from "@/components/LegalDocument";

export const metadata: Metadata = {
  title: "Política de cookies",
  description: "Cookies y tecnologías similares utilizadas por MeepleTavern."
};

export default function CookiesPage() {
  const analyticsEnabled = process.env.NEXT_PUBLIC_ANALYTICS_ENABLED !== "false";

  return (
    <LegalDocument
      eyebrow="Preferencias técnicas"
      title="Política de cookies"
      intro="Una explicación breve y concreta de las tecnologías que utiliza la web."
    >
      <section>
        <h2>Situación actual</h2>
        {analyticsEnabled ? (
          <>
            <p className="mt-3">
              MeepleTavern utiliza almacenamiento necesario para el acceso y la seguridad, y puede
              utilizar analítica opcional para entender de forma agregada cómo se usa la web.
            </p>
            <p className="mt-3">
              Esa analítica solo se carga después de que pulses “Aceptar” o la actives desde
              “Configurar”. Rechazarla no limita ninguna función de la web.
            </p>
            <CookiePreferencesButton />
          </>
        ) : (
          <p className="mt-3">
            MeepleTavern no utiliza actualmente cookies de analítica, seguimiento o publicidad. Por
            eso no mostramos un banner general: las cookies propias que se instalan son necesarias
            para que funcionen el acceso, la seguridad y las áreas autenticadas.
          </p>
        )}
      </section>

      <section>
        <h2>Cookies necesarias</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[620px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-ink/15 text-ink">
                <th className="p-3">Cookie</th>
                <th className="p-3">Finalidad</th>
                <th className="p-3">Duración orientativa</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-ink/10">
                <td className="p-3 font-mono text-xs">sb-…-auth-token*</td>
                <td className="p-3">Mantener y renovar la sesión del usuario mediante Supabase.</td>
                <td className="p-3">Sesión o el periodo configurado por el proveedor.</td>
              </tr>
              <tr>
                <td className="p-3 font-mono text-xs">meepletavern_admin_session</td>
                <td className="p-3">Proteger el acceso privado de administración.</td>
                <td className="p-3">8 horas; solo en la ruta de administración.</td>
              </tr>
              <tr className="border-t border-ink/10">
                <td className="p-3 font-mono text-xs">meepletavern_cookie_consent</td>
                <td className="p-3">Recordar en el almacenamiento local si aceptaste o rechazaste la analítica.</td>
                <td className="p-3">Hasta que borres los datos del navegador o cambie la versión del aviso.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm">El asterisco indica que Supabase puede dividir una sesión en varias cookies según su tamaño.</p>
      </section>

      {analyticsEnabled ? (
        <section>
          <h2>Analítica opcional de Vercel</h2>
          <p className="mt-3">
            Con tu aceptación cargamos Vercel Web Analytics para contar visitas y páginas vistas.
            Vercel indica que este servicio no utiliza cookies de seguimiento ni permite seguir a
            una persona entre días o sitios. Identifica visitas mediante un hash de la petición que
            se reinicia cada día y muestra únicamente estadísticas agregadas.
          </p>
          <p className="mt-3">
            Puede registrar fecha y hora, ruta visitada —sin búsquedas y con los nombres de perfil
            redactados—, referente, país o región aproximados, sistema operativo, navegador y tipo
            de dispositivo. No medimos las áreas de administración, acceso, perfil privado ni el
            editor de reseñas. No enviamos emails, alias ni contenido escrito por usuarios.
          </p>
          <p className="mt-3">
            El hash diario se descarta a las 24 horas. Las métricas agregadas permanecen visibles
            durante la ventana de informes del plan contratado en Vercel. Consulta la{" "}
            <a href="https://vercel.com/docs/analytics/privacy-policy" rel="noopener noreferrer" target="_blank">información de privacidad de Vercel Web Analytics</a>.
          </p>
        </section>
      ) : null}

      <section>
        <h2>Contenido de terceros</h2>
        <p className="mt-3">
          Las fichas pueden incluir vídeos de YouTube. El reproductor no se conecta con YouTube ni
          Google al abrir la página: solo se carga cuando pulsas “Cargar vídeo de YouTube”. A partir
          de ese momento, esos proveedores pueden utilizar cookies o tecnologías similares conforme
          a sus propias políticas. También puedes abrir enlaces de tiendas u otros sitios externos,
          que aplicarán sus propias reglas.
        </p>
      </section>

      <section>
        <h2>Cómo controlar las cookies</h2>
        <p className="mt-3">
          Puedes borrar o bloquear cookies desde la configuración de tu navegador. Si bloqueas las
          necesarias, es posible que no puedas iniciar sesión o utilizar determinadas funciones. Si
          en el futuro añadimos publicidad u otra tecnología no necesaria, actualizaremos esta
          política con su proveedor, finalidad y duración, y pediremos consentimiento antes de activarla.
        </p>
      </section>
    </LegalDocument>
  );
}
