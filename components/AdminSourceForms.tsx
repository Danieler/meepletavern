"use client";

import { useActionState } from "react";
import { SourceStatus, SourceType } from "@prisma/client";
import type { Source } from "@prisma/client";
import { Save } from "lucide-react";
import { createSourceAction, updateSourceAction, type SourceActionState } from "@/app/admin/sources/actions";
import { normalizeSourcePermissions } from "@/lib/editorialMappers";

const initialState: SourceActionState = {};
const sourceTypes = Object.values(SourceType);
const sourceStatuses = Object.values(SourceStatus);

export function CreateSourceForm() {
  const [state, action, isPending] = useActionState(createSourceAction, initialState);

  return (
    <section className="rounded-md border border-ink/10 bg-white p-5 shadow-soft">
      <h2 className="text-xl font-bold text-ink">Nueva fuente</h2>
      <form action={action} className="mt-5 space-y-4">
        <SourceFields />
        <ActionFeedback state={state} />
        <button className="button-primary" type="submit" disabled={isPending}>
          <Save size={18} aria-hidden="true" />
          Crear fuente
        </button>
      </form>
    </section>
  );
}

export function EditSourceForm({ source }: { source: Source }) {
  const [state, action, isPending] = useActionState(updateSourceAction, initialState);

  return (
    <form action={action} className="space-y-4 rounded-md border border-ink/10 bg-white p-5 shadow-soft">
      <input type="hidden" name="id" value={source.id} />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-xl font-bold text-ink">{source.name}</h3>
          <p className="mt-1 text-sm text-ink/55">{source.baseUrl}</p>
        </div>
        <button className="button-secondary min-h-10" type="submit" disabled={isPending}>
          <Save size={17} aria-hidden="true" />
          Guardar
        </button>
      </div>
      <SourceFields source={source} />
      <ActionFeedback state={state} />
    </form>
  );
}

function SourceFields({ source }: { source?: Source }) {
  const permissions = normalizeSourcePermissions(source?.permissions);

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nombre">
          <input className="field-input" name="name" required defaultValue={source?.name || ""} />
        </Field>
        <Field label="URL base">
          <input className="field-input" name="baseUrl" required defaultValue={source?.baseUrl || ""} placeholder="https://..." />
        </Field>
        <Field label="Tipo">
          <select className="field-input" name="type" defaultValue={source?.type || SourceType.manual}>
            {sourceTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Estado">
          <select className="field-input" name="status" defaultValue={source?.status || SourceStatus.not_contacted}>
            {sourceStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Email de contacto">
          <input className="field-input" name="contactEmail" defaultValue={source?.contactEmail || ""} />
        </Field>
        <Field label="Prueba de permiso">
          <input className="field-input" name="permissionProofUrl" defaultValue={source?.permissionProofUrl || ""} placeholder="https://..." />
        </Field>
      </div>

      <div className="rounded-md border border-ink/10 bg-ink/5 p-4">
        <p className="text-sm font-bold uppercase text-ink/45">Permisos</p>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <Checkbox name="canUseMetadata" label="Puede usar metadata" defaultChecked={permissions.canUseMetadata} />
          <Checkbox name="canUseImages" label="Puede usar imágenes" defaultChecked={permissions.canUseImages} />
          <Checkbox name="canUseDescriptions" label="Puede usar descripciones" defaultChecked={permissions.canUseDescriptions} />
          <Checkbox name="canUsePrices" label="Puede usar precios" defaultChecked={permissions.canUsePrices} />
          <Checkbox
            name="canStoreImagesLocally"
            label="Puede guardar imágenes localmente"
            defaultChecked={permissions.canStoreImagesLocally}
          />
          <Checkbox name="attributionRequired" label="Requiere atribución" defaultChecked={source?.attributionRequired || false} />
        </div>
      </div>

      <Field label="Texto de atribución">
        <input className="field-input" name="attributionText" defaultValue={source?.attributionText || ""} />
      </Field>
      <Field label="Notas">
        <textarea className="field-textarea min-h-24" name="notes" defaultValue={source?.notes || ""} />
      </Field>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-ink/60">{label}</span>
      <span className="mt-1 block">{children}</span>
    </label>
  );
}

function Checkbox({
  name,
  label,
  defaultChecked
}: {
  name: string;
  label: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-ink/70">
      <input name={name} type="checkbox" defaultChecked={defaultChecked} />
      {label}
    </label>
  );
}

function ActionFeedback({ state }: { state: SourceActionState }) {
  if (state.error) {
    return <p className="rounded-md border border-ruby/20 bg-ruby/10 px-3 py-2 text-sm font-semibold text-ruby">{state.error}</p>;
  }

  if (state.message) {
    return <p className="rounded-md border border-moss/20 bg-moss/10 px-3 py-2 text-sm font-semibold text-moss">{state.message}</p>;
  }

  return null;
}
