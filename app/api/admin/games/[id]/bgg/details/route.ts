import { assertTrustedAdminApiRequest, jsonNoStore } from "@/lib/adminApiSecurity";
import { getBggGameDetails, BggApiError } from "@/lib/bgg";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    assertTrustedAdminApiRequest(request, { requireJson: true });
    await context.params;
    const body = (await request.json()) as { bggId?: number | string };
    const bggId = Number(body.bggId);

    if (!Number.isFinite(bggId) || bggId <= 0) {
      return jsonNoStore({ error: "El identificador de BGG no es válido." }, { status: 400 });
    }

    const details = await getBggGameDetails(bggId);
    return jsonNoStore({ details });
  } catch (error) {
    return jsonNoStore({ error: mapBggError(error) }, { status: statusFromError(error) });
  }
}

function mapBggError(error: unknown) {
  if (error instanceof BggApiError) {
    return error.message;
  }

  return error instanceof Error ? error.message : "No se pudieron cargar los detalles de BGG.";
}

function statusFromError(error: unknown) {
  if (error instanceof BggApiError) {
    return error.status;
  }

  if (error instanceof Error && "status" in error && typeof error.status === "number") {
    return error.status;
  }

  return 500;
}
