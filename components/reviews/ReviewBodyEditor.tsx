"use client";

import React, { useId, useRef, useState } from "react";
import { Bold, Eye, Heading2, ImagePlus, Italic, Link2, List, ListOrdered, Pencil } from "lucide-react";
import { ReviewContent } from "@/components/reviews/ReviewContent";
import { REVIEW_BODY_MAX_LENGTH } from "@/lib/reviewContent";

type ReviewBodyEditorProps = {
  value: string;
  onChange: (value: string) => void;
  name?: string;
  required?: boolean;
};

export function ReviewBodyEditor({ value, onChange, name = "body", required = false }: ReviewBodyEditorProps) {
  const id = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState(false);

  function replaceSelection(before: string, after: string, placeholder: string) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selection = value.slice(start, end) || placeholder;
    const nextValue = `${value.slice(0, start)}${before}${selection}${after}${value.slice(end)}`;
    if (nextValue.length > REVIEW_BODY_MAX_LENGTH) return;
    onChange(nextValue);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selection.length);
    });
  }

  function prefixLines(prefix: string, placeholder: string) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selection = value.slice(start, end) || placeholder;
    const formatted = selection.split("\n").map((line) => `${prefix}${line}`).join("\n");
    const nextValue = `${value.slice(0, start)}${formatted}${value.slice(end)}`;
    if (nextValue.length > REVIEW_BODY_MAX_LENGTH) return;
    onChange(nextValue);
    requestAnimationFrame(() => textarea.focus());
  }

  return (
    <div className="overflow-hidden rounded-lg border border-walnut/20 bg-paper shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-walnut/15 bg-parchment/60 px-3 py-2.5">
        <div className="flex flex-wrap gap-1.5" role="toolbar" aria-label="Formato de la reseña">
          <ToolButton label="Título" icon={<Heading2 size={15} />} onClick={() => prefixLines("## ", "Título de sección")} />
          <ToolButton label="Negrita" icon={<Bold size={15} />} onClick={() => replaceSelection("**", "**", "texto importante")} />
          <ToolButton label="Cursiva" icon={<Italic size={15} />} onClick={() => replaceSelection("_", "_", "texto en cursiva")} />
          <ToolButton label="Lista" icon={<List size={15} />} onClick={() => prefixLines("- ", "Elemento de la lista")} />
          <ToolButton label="Lista numerada" icon={<ListOrdered size={15} />} onClick={() => prefixLines("1. ", "Elemento de la lista")} />
          <ToolButton label="Enlace" icon={<Link2 size={15} />} onClick={() => replaceSelection("[", "](https://ejemplo.com)", "texto del enlace")} />
          <ToolButton label="Imagen" icon={<ImagePlus size={15} />} onClick={() => replaceSelection("\n\n![", "](https://ejemplo.com/imagen.jpg)\n\n", "Descripción de la imagen")} />
        </div>
        <button
          type="button"
          className="button-secondary min-h-9 px-3 py-1.5 text-xs flex items-center gap-1.5 border-walnut/20 shadow-xs hover:border-ember"
          onClick={() => setPreview((current) => !current)}
        >
          {preview ? <Pencil size={14} /> : <Eye size={14} />}
          <span>{preview ? "Editar" : "Vista previa"}</span>
        </button>
      </div>

      <label htmlFor={id} className="sr-only">Contenido de la reseña</label>
      <textarea
        ref={textareaRef}
        id={id}
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required && !preview}
        maxLength={REVIEW_BODY_MAX_LENGTH}
        hidden={preview}
        className="min-h-[460px] md:min-h-[520px] w-full resize-y bg-white/50 px-4 py-4 font-mono text-sm leading-6 text-ink outline-none transition focus:bg-white focus:ring-2 focus:ring-moss/20 focus:ring-inset"
        placeholder="Escribe tu análisis detallado aquí. Cuenta cómo se juega, qué sensaciones deja en mesa, para qué tipo de jugadores lo recomendarías y cuáles son tus conclusiones tras probarlo."
      />
      {preview ? (
        <div className="min-h-[460px] md:min-h-[520px] bg-white/50 p-6 overflow-y-auto border-b border-walnut/10">
          <ReviewContent body={value} />
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-walnut/10 px-4 py-2.5 text-xs font-semibold text-walnut/55">
        <span>Admite títulos, negrita, cursiva, listas, enlaces e imágenes HTTPS.</span>
        <span>{value.length.toLocaleString("es-ES")} / {REVIEW_BODY_MAX_LENGTH.toLocaleString("es-ES")}</span>
      </div>
    </div>
  );
}

function ToolButton({ label, icon, onClick }: { label: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-walnut/10 bg-white/40 px-2.5 text-xs font-bold text-walnut shadow-sm transition hover:bg-white hover:text-wood hover:border-walnut/30 focus:outline-none focus:ring-2 focus:ring-moss focus:ring-offset-1 focus:ring-offset-parchment"
      onClick={onClick}
      title={label}
      aria-label={label}
    >
      <span className="text-walnut/70 group-hover:text-wood">{icon}</span>
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

