import { mobileOpenApiSpec } from "@/lib/mobile/openapi";

type OpenApiOperation = {
  summary?: string;
  description?: string;
  parameters?: readonly {
    name: string;
    in: string;
    required?: boolean;
    description?: string;
    schema?: {
      type?: string | readonly string[];
      enum?: readonly string[];
      default?: string | number;
      minimum?: number;
      maximum?: number;
    };
  }[];
  responses?: Record<string, { description?: string }>;
};

type OpenApiPathItem = Partial<Record<"get", OpenApiOperation>>;

export async function GET() {
  const html = renderDocsHtml();

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function renderDocsHtml() {
  const paths = mobileOpenApiSpec.paths as unknown as Record<string, OpenApiPathItem>;
  const endpointCards = Object.entries(paths)
    .flatMap(([path, item]) => {
      const operation = item.get;
      if (!operation) return [];
      return [renderEndpointCard("GET", path, operation)];
    })
    .join("");

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(mobileOpenApiSpec.info.title)}</title>
    <style>
      :root {
        color-scheme: light;
        --ink: #241b16;
        --muted: #6f6259;
        --line: #e8ded2;
        --paper: #fffaf2;
        --panel: #ffffff;
        --accent: #b85b34;
        --code: #2d2926;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        background: var(--paper);
        color: var(--ink);
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        line-height: 1.5;
      }
      main {
        width: min(1120px, calc(100% - 32px));
        margin: 0 auto;
        padding: 44px 0 64px;
      }
      header {
        border-bottom: 1px solid var(--line);
        padding-bottom: 24px;
        margin-bottom: 28px;
      }
      h1 {
        margin: 0 0 8px;
        font-size: clamp(2rem, 4vw, 3.5rem);
        line-height: 1;
      }
      p {
        margin: 0;
        color: var(--muted);
      }
      a {
        color: var(--accent);
        font-weight: 800;
        text-decoration: none;
      }
      a:hover { text-decoration: underline; }
      .toolbar {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 22px;
      }
      .button {
        display: inline-flex;
        align-items: center;
        min-height: 38px;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: var(--panel);
        padding: 0 14px;
        color: var(--ink);
        font-size: 14px;
        font-weight: 850;
      }
      .grid {
        display: grid;
        gap: 14px;
      }
      article {
        border: 1px solid var(--line);
        border-radius: 8px;
        background: var(--panel);
        padding: 18px;
        box-shadow: 0 8px 24px rgba(36, 27, 22, 0.05);
      }
      .endpoint-head {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 10px;
        margin-bottom: 8px;
      }
      .method {
        border-radius: 6px;
        background: #0f6f47;
        color: white;
        padding: 4px 8px;
        font-size: 12px;
        font-weight: 900;
        letter-spacing: 0.03em;
      }
      code {
        border-radius: 6px;
        background: #f4ede5;
        color: var(--code);
        padding: 3px 6px;
        font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
        font-size: 0.92em;
      }
      h2 {
        margin: 0;
        font-size: 1.15rem;
      }
      h3 {
        margin: 14px 0 8px;
        color: var(--muted);
        font-size: 0.78rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        overflow: hidden;
        font-size: 14px;
      }
      th, td {
        border-top: 1px solid var(--line);
        padding: 9px 8px;
        text-align: left;
        vertical-align: top;
      }
      th {
        color: var(--muted);
        font-size: 12px;
        text-transform: uppercase;
      }
      .empty {
        color: var(--muted);
        font-size: 14px;
      }
      .responses {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .status {
        border: 1px solid var(--line);
        border-radius: 999px;
        padding: 5px 9px;
        color: var(--muted);
        font-size: 13px;
        font-weight: 750;
      }
    </style>
  </head>
  <body>
    <main>
      <header>
        <h1>${escapeHtml(mobileOpenApiSpec.info.title)}</h1>
        <p>${escapeHtml(mobileOpenApiSpec.info.description)}</p>
        <div class="toolbar">
          <a class="button" href="/api/mobile/v1/openapi.json">OpenAPI JSON</a>
          <a class="button" href="/api/mobile/v1/games?limit=1">Probar /games?limit=1</a>
          <a class="button" href="/api/mobile/v1/filters">Ver /filters</a>
        </div>
      </header>
      <section class="grid" aria-label="Endpoints">
        ${endpointCards}
      </section>
    </main>
  </body>
</html>`;
}

function renderEndpointCard(method: string, path: string, operation: OpenApiOperation) {
  return `<article>
    <div class="endpoint-head">
      <span class="method">${escapeHtml(method)}</span>
      <code>${escapeHtml(`/api/mobile/v1${path}`)}</code>
    </div>
    <h2>${escapeHtml(operation.summary || path)}</h2>
    ${operation.description ? `<p>${escapeHtml(operation.description)}</p>` : ""}
    ${renderParameters(operation.parameters || [])}
    ${renderResponses(operation.responses || {})}
  </article>`;
}

function renderParameters(parameters: NonNullable<OpenApiOperation["parameters"]>) {
  if (!parameters.length) {
    return `<h3>Parametros</h3><p class="empty">Sin parametros.</p>`;
  }

  const rows = parameters
    .map((parameter) => {
      const schema = parameter.schema;
      const type = Array.isArray(schema?.type) ? schema.type.join(" | ") : schema?.type || "";
      const enumValues = schema?.enum?.length ? `Valores: ${schema.enum.join(", ")}` : "";
      const range = [
        typeof schema?.minimum === "number" ? `min ${schema.minimum}` : "",
        typeof schema?.maximum === "number" ? `max ${schema.maximum}` : ""
      ].filter(Boolean).join(", ");
      const details = [type, enumValues, range].filter(Boolean).join("<br />");

      return `<tr>
        <td><code>${escapeHtml(parameter.name)}</code></td>
        <td>${escapeHtml(parameter.in)}${parameter.required ? " · requerido" : ""}</td>
        <td>${details || "-"}</td>
        <td>${escapeHtml(parameter.description || "")}</td>
      </tr>`;
    })
    .join("");

  return `<h3>Parametros</h3>
    <table>
      <thead><tr><th>Nombre</th><th>Ubicacion</th><th>Tipo</th><th>Descripcion</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function renderResponses(responses: NonNullable<OpenApiOperation["responses"]>) {
  const items = Object.entries(responses)
    .map(([status, response]) => `<span class="status">${escapeHtml(status)} ${escapeHtml(response.description || "")}</span>`)
    .join("");

  return `<h3>Respuestas</h3><div class="responses">${items}</div>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
