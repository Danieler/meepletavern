"use client";

import React, { useId, useMemo, useRef, useState } from "react";
import {
  Bold,
  Columns2,
  Eye,
  Heading2,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Pencil,
  Quote
} from "lucide-react";
import { ReviewContent } from "@/components/reviews/ReviewContent";
import { REVIEW_BODY_MAX_LENGTH } from "@/lib/reviewContent";

type ReviewBodyEditorProps = {
  value: string;
  onChange: (value: string) => void;
  name?: string;
  required?: boolean;
};

type EditorMode = "write" | "preview" | "split";
type SelectionRange = { start: number; end: number };

export function ReviewBodyEditor({ value, onChange, name = "body", required = false }: ReviewBodyEditorProps) {
  const id = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastSelectionRef = useRef<SelectionRange>({ start: value.length, end: value.length });
  const [mode, setMode] = useState<EditorMode>("write");
  const stats = useMemo(() => getBodyStats(value), [value]);
  const showEditor = mode !== "preview";
  const showPreview = mode !== "write";

  function getInsertionRange() {
    const textarea = textareaRef.current;
    if (textarea && !textarea.hidden) {
      const range = { start: textarea.selectionStart, end: textarea.selectionEnd };
      lastSelectionRef.current = range;
      return range;
    }

    const start = Math.min(lastSelectionRef.current.start, value.length);
    const end = Math.min(lastSelectionRef.current.end, value.length);
    return { start, end: Math.max(start, end) };
  }

  function rememberSelection() {
    const textarea = textareaRef.current;
    if (!textarea || textarea.hidden) return;
    lastSelectionRef.current = {
      start: textarea.selectionStart,
      end: textarea.selectionEnd
    };
  }

  function focusEditor(selectionStart: number, selectionEnd = selectionStart) {
    if (mode === "preview") {
      setMode("write");
    }

    requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.focus();
      textarea.setSelectionRange(selectionStart, selectionEnd);
      lastSelectionRef.current = { start: selectionStart, end: selectionEnd };
    });
  }

  function replaceSelection(before: string, after: string, placeholder: string) {
    const { start, end } = getInsertionRange();
    const selection = value.slice(start, end) || placeholder;
    const nextValue = `${value.slice(0, start)}${before}${selection}${after}${value.slice(end)}`;
    if (nextValue.length > REVIEW_BODY_MAX_LENGTH) return;
    onChange(nextValue);
    focusEditor(start + before.length, start + before.length + selection.length);
  }

  function prefixLines(prefix: string, placeholder: string) {
    const { start, end } = getInsertionRange();
    const selection = value.slice(start, end) || placeholder;
    const formatted = selection.split("\n").map((line) => `${prefix}${line}`).join("\n");
    const nextValue = `${value.slice(0, start)}${formatted}${value.slice(end)}`;
    if (nextValue.length > REVIEW_BODY_MAX_LENGTH) return;
    onChange(nextValue);
    focusEditor(start, start + formatted.length);
  }

  function insertImageTemplate() {
    const { end } = getInsertionRange();
    const beforeUrl = "\n\n![Descripción de la imagen](";
    const urlPlaceholder = "https://ejemplo.com/imagen.jpg";
    const afterUrl = ")\n\n";
    const template = `${beforeUrl}${urlPlaceholder}${afterUrl}`;
    const nextValue = `${value.slice(0, end)}${template}${value.slice(end)}`;
    if (nextValue.length > REVIEW_BODY_MAX_LENGTH) return;

    onChange(nextValue);
    focusEditor(end + beforeUrl.length, end + beforeUrl.length + urlPlaceholder.length);
  }

  return (
    <div className="overflow-hidden rounded-md border border-walnut/20 bg-paper shadow-sm">
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b border-walnut/15 bg-parchment/95 px-3 py-2.5 backdrop-blur">
        <div className="flex flex-wrap gap-1.5" role="toolbar" aria-label="Formato de la reseña">
          <ToolButton label="Título" icon={<Heading2 size={15} />} onClick={() => prefixLines("## ", "Título de sección")} />
          <ToolButton label="Negrita" icon={<Bold size={15} />} onClick={() => replaceSelection("**", "**", "texto importante")} />
          <ToolButton label="Cursiva" icon={<Italic size={15} />} onClick={() => replaceSelection("_", "_", "texto en cursiva")} />
          <ToolButton label="Cita" icon={<Quote size={15} />} onClick={() => prefixLines("> ", "Frase destacada")} />
          <ToolButton label="Lista" icon={<List size={15} />} onClick={() => prefixLines("- ", "Elemento de la lista")} />
          <ToolButton label="Lista numerada" icon={<ListOrdered size={15} />} onClick={() => prefixLines("1. ", "Elemento de la lista")} />
          <ToolButton label="Enlace" icon={<Link2 size={15} />} onClick={() => replaceSelection("[", "](https://ejemplo.com)", "texto del enlace")} />
          <ToolButton label="Imagen" icon={<ImagePlus size={15} />} onClick={insertImageTemplate} />
        </div>
        <div className="inline-flex overflow-hidden rounded-md border border-walnut/15 bg-white/60 p-0.5 shadow-sm" aria-label="Modo del editor">
          <ModeButton active={mode === "write"} icon={<Pencil size={14} />} label="Editar" onClick={() => setMode("write")} />
          <ModeButton active={mode === "preview"} icon={<Eye size={14} />} label="Vista" onClick={() => setMode("preview")} />
          <ModeButton active={mode === "split"} icon={<Columns2 size={14} />} label="Dividir" onClick={() => setMode("split")} />
        </div>
      </div>

      <div className={mode === "split" ? "grid lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.92fr)]" : ""}>
        <label htmlFor={id} className="sr-only">Contenido de la reseña</label>
        <textarea
          ref={textareaRef}
          id={id}
          name={name}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onSelect={rememberSelection}
          onClick={rememberSelection}
          onKeyUp={rememberSelection}
          required={required && showEditor}
          maxLength={REVIEW_BODY_MAX_LENGTH}
          hidden={!showEditor}
          className={`min-h-[500px] w-full resize-y bg-white/60 px-4 py-4 font-mono text-sm leading-6 text-ink outline-none transition focus:bg-white focus:ring-2 focus:ring-moss/20 focus:ring-inset md:min-h-[620px] ${mode === "split" ? "lg:border-r lg:border-walnut/10" : ""}`}
          placeholder="Escribe tu análisis detallado aquí. Cuenta cómo se juega, qué sensaciones deja en mesa, para qué tipo de jugadores lo recomendarías y cuáles son tus conclusiones tras probarlo."
        />
        {showPreview ? (
          <div className="max-h-[620px] min-h-[500px] overflow-y-auto border-t border-walnut/10 bg-white px-5 py-5 md:min-h-[620px] lg:border-t-0">
            {value.trim() ? (
              <ReviewContent body={value} />
            ) : (
              <p className="rounded-md border border-dashed border-walnut/20 bg-parchment/40 px-4 py-3 text-sm font-semibold text-walnut/55">
                La vista previa aparecerá cuando empieces a escribir.
              </p>
            )}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-walnut/10 px-4 py-2.5 text-xs font-semibold text-walnut/60">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <span>{stats.words.toLocaleString("es-ES")} palabras</span>
          <span>{stats.readingMinutes} min lectura</span>
        </div>
        <span className={stats.remaining < 1_500 ? "text-ruby" : ""}>
          {value.length.toLocaleString("es-ES")} / {REVIEW_BODY_MAX_LENGTH.toLocaleString("es-ES")} caracteres
        </span>
      </div>
    </div>
  );
}

function ModeButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className={`inline-flex min-h-8 items-center gap-1.5 rounded px-2.5 text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-moss focus:ring-offset-1 focus:ring-offset-parchment ${
        active ? "bg-wood text-white shadow-sm" : "text-walnut hover:bg-white hover:text-wood"
      }`}
      onClick={onClick}
      aria-pressed={active}
      title={label}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function ToolButton({ label, icon, onClick, active = false }: { label: string; icon: React.ReactNode; onClick: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      className={`inline-flex min-h-9 items-center gap-1.5 rounded-md border px-2.5 text-xs font-bold shadow-sm transition focus:outline-none focus:ring-2 focus:ring-moss focus:ring-offset-1 focus:ring-offset-parchment ${
        active
          ? "border-ember/45 bg-ember/10 text-wood"
          : "border-walnut/10 bg-white/40 text-walnut hover:border-walnut/30 hover:bg-white hover:text-wood"
      }`}
      onClick={onClick}
      title={label}
      aria-label={label}
    >
      <span className="text-walnut/70 group-hover:text-wood">{icon}</span>
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function getBodyStats(value: string) {
  const words = value.trim() ? value.trim().split(/\s+/).length : 0;

  return {
    words,
    readingMinutes: Math.max(1, Math.ceil(words / 220)),
    remaining: REVIEW_BODY_MAX_LENGTH - value.length
  };
}
