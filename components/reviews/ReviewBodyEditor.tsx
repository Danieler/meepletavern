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
    <div className="overflow-hidden rounded-md border border-walnut/20 bg-paper shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-walnut/15 bg-parchment/70 p-2">
        <div className="flex flex-wrap gap-1" role="toolbar" aria-label="Formato de la reseña">
          <ToolButton label="Título" icon={<Heading2 size={16} />} onClick={() => prefixLines("## ", "Título de sección")} />
          <ToolButton label="Negrita" icon={<Bold size={16} />} onClick={() => replaceSelection("**", "**", "texto importante")} />
          <ToolButton label="Cursiva" icon={<Italic size={16} />} onClick={() => replaceSelection("_", "_", "texto en cursiva")} />
          <ToolButton label="Lista" icon={<List size={16} />} onClick={() => prefixLines("- ", "Elemento de la lista")} />
          <ToolButton label="Lista numerada" icon={<ListOrdered size={16} />} onClick={() => prefixLines("1. ", "Elemento de la lista")} />
          <ToolButton label="Enlace" icon={<Link2 size={16} />} onClick={() => replaceSelection("[", "](https://ejemplo.com)", "texto del enlace")} />
          <ToolButton label="Imagen por URL" icon={<ImagePlus size={16} />} onClick={() => replaceSelection("\n\n![", "](https://ejemplo.com/imagen.jpg)\n\n", "Descripción de la imagen")} />
        </div>
        <button type="button" className="button-secondary min-h-9 px-3 py-1.5 text-xs" onClick={() => setPreview((current) => !current)}>
          {preview ? <Pencil size={15} /> : <Eye size={15} />}
          {preview ? "Editar" : "Vista previa"}
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
        className="min-h-80 w-full resize-y bg-white/80 px-4 py-4 font-mono text-sm leading-6 text-ink outline-none focus:bg-white"
        placeholder="Cuenta cómo se juega, qué sensaciones deja y para qué tipo de mesa lo recomendarías."
      />
      {preview ? <div className="min-h-80 bg-white/80 p-5"><ReviewContent body={value} /></div> : null}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-walnut/10 px-3 py-2 text-xs font-semibold text-walnut/55">
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
      className="focus-ring inline-flex min-h-9 items-center gap-1.5 rounded px-2.5 text-xs font-bold text-walnut transition hover:bg-white hover:text-wood"
      onClick={onClick}
      title={label}
      aria-label={label}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
