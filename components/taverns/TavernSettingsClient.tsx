"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { DoorOpen, Loader2, Save, Trash2 } from "lucide-react";

export function TavernSettingsClient({ tavernId, name: initialName, role }: { tavernId: string; name: string; role: "ADMIN" | "MEMBER" }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState<"save" | "leave" | "delete" | null>(null);
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
    if (!window.confirm("¿Salir de esta taberna? Tus juegos dejarán de contar en su ludoteca.")) return;
    setPending("leave");
    setFeedback(null);
    try {
      await mutate(`/api/account/taverns/${tavernId}/leave`, "POST", {});
      router.push("/comunidad/tabernas");
      router.refresh();
    } catch (caught) {
      setFeedback({ tone: "error", text: errorText(caught) });
      setPending(null);
    }
  }

  async function removeTavern(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!window.confirm("Esta acción eliminará miembros, invitaciones y partidas de la taberna. ¿Continuar?")) return;
    setPending("delete");
    setFeedback(null);
    try {
      await mutate(`/api/account/taverns/${tavernId}`, "DELETE", { confirmation });
      router.push("/comunidad/tabernas");
      router.refresh();
    } catch (caught) {
      setFeedback({ tone: "error", text: errorText(caught) });
      setPending(null);
    }
  }

  return (
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
          <p className="mt-2 text-sm font-semibold leading-6 text-walnut/65">Tus juegos dejarán de formar parte de la ludoteca conjunta. Las partidas históricas se conservarán.</p>
          <button className="button-secondary mt-5" disabled={pending !== null} onClick={() => void leave()}>{pending === "leave" ? <Loader2 className="animate-spin" size={17} /> : <DoorOpen size={17} />} Salir de la taberna</button>
        </section>
      </div>

      <aside className="space-y-5">
        {feedback ? <p className={`rounded-md border px-4 py-3 text-sm font-bold ${feedback.tone === "success" ? "border-moss/20 bg-moss/8 text-moss" : "border-ruby/20 bg-ruby/8 text-ruby"}`} role={feedback.tone === "error" ? "alert" : "status"}>{feedback.text}</p> : null}
        {isAdmin ? (
          <section className="rounded-md border border-ruby/20 bg-ruby/5 p-5">
            <Trash2 className="text-ruby" size={22} />
            <h2 className="font-display mt-3 text-2xl font-bold text-wood">Eliminar taberna</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-walnut/65">Elimina definitivamente el grupo y sus partidas. Las ludotecas personales no se modifican.</p>
            <form className="mt-4 grid gap-3" onSubmit={removeTavern}>
              <label><span className="field-label">Escribe “{initialName}” para confirmar</span><input className="field-input mt-2" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>
              <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-ruby px-4 text-sm font-extrabold text-white disabled:opacity-50" disabled={pending !== null || confirmation !== initialName} type="submit">{pending === "delete" ? <Loader2 className="animate-spin" size={17} /> : <Trash2 size={17} />} Eliminar taberna</button>
            </form>
          </section>
        ) : null}
      </aside>
    </div>
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
