"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { DoorOpen, Loader2, Save, Trash2 } from "lucide-react";
import { TavernConfirmDialog } from "@/components/taverns/TavernConfirmDialog";

export function TavernSettingsClient({ tavernId, name: initialName, role }: { tavernId: string; name: string; role: "ADMIN" | "MEMBER" }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState<"save" | "leave" | "delete" | null>(null);
  const [confirmIntent, setConfirmIntent] = useState<"leave" | "delete" | null>(null);
  const [confirmError, setConfirmError] = useState("");
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const isAdmin = role === "ADMIN";

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending("save");
    setFeedback(null);
    try {
      await mutate(`/api/account/taverns/${tavernId}`, "PATCH", { name });
      setFeedback({ tone: "success", text: "Nombre actualizado." });
      router.refresh();
    } catch (caught) {
      setFeedback({ tone: "error", text: errorText(caught) });
    } finally {
      setPending(null);
    }
  }

  async function leave() {
    setPending("leave");
    setConfirmError("");
    setFeedback(null);
    try {
      await mutate(`/api/account/taverns/${tavernId}/leave`, "POST", {});
      router.push("/comunidad/tabernas");
      router.refresh();
    } catch (caught) {
      setConfirmError(errorText(caught));
      setPending(null);
    }
  }

  function requestRemoveTavern(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setConfirmError("");
    setConfirmIntent("delete");
  }

  async function removeTavern() {
    setPending("delete");
    setConfirmError("");
    setFeedback(null);
    try {
      await mutate(`/api/account/taverns/${tavernId}`, "DELETE", { confirmation });
      router.push("/comunidad/tabernas");
      router.refresh();
    } catch (caught) {
      setConfirmError(errorText(caught));
      setPending(null);
    }
  }

  return (
    <>
      <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="space-y-6">
          {isAdmin ? (
            <section className="tavern-card p-5 sm:p-6">
              <p className="tavern-eyebrow">Identidad</p>
              <h2 className="font-display mt-2 text-3xl font-bold text-wood">Nombre de la taberna</h2>
              <form className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]" onSubmit={save}>
                <label><span className="field-label">Nombre</span><input className="field-input mt-2" required minLength={2} maxLength={60} value={name} onChange={(event) => setName(event.target.value)} /></label>
                <button className="button-primary self-end" disabled={pending !== null} type="submit">{pending === "save" ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />} Guardar</button>
              </form>
            </section>
          ) : null}

          <section className="tavern-card p-5 sm:p-6">
            <DoorOpen className="text-ember" size={24} />
            <h2 className="font-display mt-3 text-2xl font-bold text-wood">Abandonar la taberna</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-walnut/65">
              Tus juegos dejarán de formar parte de la ludoteca conjunta. Las partidas históricas se conservarán.
              {isAdmin ? " Si eres el último administrador, primero tendrás que nombrar a otro." : ""}
            </p>
            <button
              className="button-secondary mt-5"
              disabled={pending !== null}
              onClick={() => {
                setConfirmError("");
                setConfirmIntent("leave");
              }}
            >
              {pending === "leave" ? <Loader2 className="animate-spin" size={17} /> : <DoorOpen size={17} />} Salir de la taberna
            </button>
          </section>
        </div>

        <aside className="space-y-5">
          {feedback ? <p className={`rounded-md border px-4 py-3 text-sm font-bold ${feedback.tone === "success" ? "border-moss/20 bg-moss/8 text-moss" : "border-ruby/20 bg-ruby/8 text-ruby"}`} role={feedback.tone === "error" ? "alert" : "status"}>{feedback.text}</p> : null}
          {isAdmin ? (
            <section className="rounded-md border border-ruby/20 bg-ruby/5 p-5">
              <Trash2 className="text-ruby" size={22} />
              <h2 className="font-display mt-3 text-2xl font-bold text-wood">Eliminar taberna</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-walnut/65">Elimina definitivamente el grupo y sus partidas. Las ludotecas personales no se modifican.</p>
              <form className="mt-4 grid gap-3" onSubmit={requestRemoveTavern}>
                <label><span className="field-label">Escribe “{initialName}” para confirmar</span><input className="field-input mt-2" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>
                <button className="button-danger" disabled={pending !== null || confirmation !== initialName} type="submit">{pending === "delete" ? <Loader2 className="animate-spin" size={17} /> : <Trash2 size={17} />} Eliminar taberna</button>
              </form>
            </section>
          ) : null}
        </aside>
      </div>

      <TavernConfirmDialog
        open={confirmIntent !== null}
        title={confirmIntent === "delete" ? `¿Eliminar “${initialName}”?` : `¿Salir de “${initialName}”?`}
        description={confirmIntent === "delete"
          ? "Se eliminarán definitivamente sus miembros, invitaciones y partidas. Las ludotecas personales no se modificarán. Esta acción no se puede deshacer."
          : `Tus juegos dejarán de contar en la ludoteca conjunta y el historial se conservará.${isAdmin ? " Si eres el último administrador, la salida no será posible hasta que nombres a otro." : ""}`}
        confirmLabel={confirmIntent === "delete" ? "Eliminar definitivamente" : "Salir de la taberna"}
        pendingLabel={confirmIntent === "delete" ? "Eliminando..." : "Saliendo..."}
        pending={pending === confirmIntent}
        error={confirmError}
        tone="danger"
        onCancel={() => {
          if (pending === confirmIntent) return;
          setConfirmIntent(null);
          setConfirmError("");
        }}
        onConfirm={() => {
          if (confirmIntent === "delete") void removeTavern();
          if (confirmIntent === "leave") void leave();
        }}
      />
    </>
  );
}

async function mutate(url: string, method: string, body: unknown) {
  const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) throw new Error(payload?.error || "No se pudo completar la acción.");
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message : "No se pudo completar la acción.";
}
