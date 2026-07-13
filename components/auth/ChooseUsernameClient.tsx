"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AtSign, Loader2, LockKeyhole } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { USERNAME_MAX_LENGTH, USERNAME_MIN_LENGTH } from "@/lib/usernames";

export function ChooseUsernameClient({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const { signOut } = useAuth();
  const [username, setUsername] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/account/username", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username })
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error || "No se pudo guardar el nombre de usuario.");
      router.replace(nextPath);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo guardar el nombre de usuario.");
      setPending(false);
    }
  }

  async function leave() {
    await signOut();
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-12 pt-5 sm:px-6 sm:pt-10">
      <section className="rounded-xl border border-walnut/12 bg-white p-6 shadow-soft sm:p-8">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-ember/12 text-ember"><AtSign size={22} /></span>
        <p className="tavern-eyebrow mt-5">Último paso</p>
        <h1 className="font-display mt-2 text-4xl font-bold leading-tight text-wood sm:text-5xl">Elige tu nombre de usuario</h1>
        <p className="mt-3 max-w-xl text-base font-semibold leading-7 text-walnut/68">
          Será el nombre con el que podrán encontrarte e invitarte a una taberna. No usamos ni mostramos tu email como nombre público.
        </p>

        <form className="mt-7 grid gap-4" onSubmit={submit}>
          <label>
            <span className="field-label">Nombre de usuario público</span>
            <span className="relative mt-2 block">
              <AtSign className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-walnut/40" size={17} />
              <input
                className="field-input pl-9"
                required
                autoFocus
                autoComplete="username"
                minLength={USERNAME_MIN_LENGTH}
                maxLength={USERNAME_MAX_LENGTH}
                pattern="[a-z0-9_-]+"
                value={username}
                onChange={(event) => setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                placeholder="daniel_juega"
                aria-describedby="username-help"
              />
            </span>
          </label>
          <p id="username-help" className="text-xs font-semibold leading-5 text-walnut/55">
            Entre {USERNAME_MIN_LENGTH} y {USERNAME_MAX_LENGTH} caracteres. Puedes usar letras minúsculas, números, guiones y guiones bajos.
          </p>
          {error ? <p className="rounded-md border border-ruby/20 bg-ruby/8 px-4 py-3 text-sm font-bold text-ruby" role="alert">{error}</p> : null}
          <button className="button-primary mt-1 justify-center" type="submit" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" size={17} /> : <AtSign size={17} />}
            {pending ? "Guardando..." : "Continuar con este usuario"}
          </button>
        </form>

        <div className="mt-6 flex items-start gap-2 border-t border-walnut/10 pt-5 text-xs font-semibold leading-5 text-walnut/55">
          <LockKeyhole className="mt-0.5 shrink-0 text-moss" size={15} />
          <p>Tu email se utiliza únicamente para acceder y gestionar tu cuenta. No forma parte de tu perfil público.</p>
        </div>
        <button className="mt-5 text-xs font-bold text-walnut/45 underline hover:text-wood" type="button" onClick={() => void leave()}>
          Salir de esta cuenta
        </button>
      </section>
    </main>
  );
}
