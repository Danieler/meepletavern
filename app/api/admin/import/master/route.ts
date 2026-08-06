import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { formatImportError, safeAdminErrorLog } from "@/lib/adminErrorPresentation";
import { assertTrustedAdminApiRequest, jsonNoStore, AdminApiSecurityError } from "@/lib/adminApiSecurity";
import { runMasterImportBatch } from "@/lib/import/masterImportBatch";

export async function POST(request: NextRequest) {
  try {
    assertTrustedAdminApiRequest(request, { requireJson: true });
  } catch (error) {
    if (error instanceof AdminApiSecurityError) {
      return jsonNoStore({ error: error.message }, { status: error.status });
    }

    throw error;
  }

  let rawInput = "";
  try {
    const body = (await request.json()) as { titles?: unknown };
    if (typeof body.titles !== "string") {
      return jsonNoStore({ error: "El lote debe enviarse como JSON con `titles`." }, { status: 400 });
    }

    rawInput = body.titles;
  } catch {
    return jsonNoStore({ error: "El cuerpo debe ser JSON válido." }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const writeEvent = (event: unknown) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };

      void runMasterImportBatch({
        rawInput,
        onEvent: writeEvent
      })
        .then((state) => {
          if (state.totals?.imported) {
            try {
              revalidatePath("/admin/import");
              revalidatePath("/admin/candidates");
            } catch (error) {
              console.error("[master-import] revalidation failed after import", safeAdminErrorLog(error));
            }
          }

          controller.close();
        })
        .catch((error) => {
          console.error("[master-import] stream failed", safeAdminErrorLog(error));
          try {
            writeEvent({
              type: "error",
              message: formatImportError(error)
            });
          } catch {
            // If the client disconnected, the stream may already be closed.
          }
          controller.close();
        });
    }
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
