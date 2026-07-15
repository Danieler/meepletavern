import assert from "node:assert/strict";
import test from "node:test";
import {
  AuthenticationRequiredError,
  getAccountApiError
} from "@/lib/accountErrors";

test("account errors keep auth failures separate from infrastructure failures", () => {
  assert.deepEqual(getAccountApiError(new AuthenticationRequiredError()), {
    message: "No autenticado.",
    status: 401,
    code: "authentication_required"
  });

  assert.deepEqual(
    getAccountApiError({ name: "PrismaClientInitializationError", message: "Can't reach database server" }),
    {
      message: "No hemos podido cargar tu cuenta ahora mismo. Prueba de nuevo en unos segundos.",
      status: 503,
      code: "service_unavailable"
    }
  );
});
