"use client";

import { Plus, Trash2 } from "lucide-react";

type EditableListProps = {
  label: string;
  values: string[];
  placeholder?: string;
  onChange: (values: string[]) => void;
};

export function EditableList({ label, values, placeholder, onChange }: EditableListProps) {
  function updateValue(index: number, nextValue: string) {
    onChange(values.map((value, currentIndex) => (currentIndex === index ? nextValue : value)));
  }

  function addValue() {
    onChange([...values, ""]);
  }

  function removeValue(index: number) {
    onChange(values.filter((_, currentIndex) => currentIndex !== index));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <label className="field-label">{label}</label>
        <button type="button" className="button-secondary min-h-9 px-3 py-1.5" onClick={addValue}>
          <Plus size={16} aria-hidden="true" />
          Añadir
        </button>
      </div>
      <div className="space-y-2">
        {values.map((value, index) => (
          <div key={index} className="flex gap-2">
            <input
              value={value}
              placeholder={placeholder}
              onChange={(event) => updateValue(index, event.target.value)}
              className="field-input"
            />
            <button
              type="button"
              aria-label={`Borrar ${label}`}
              className="button-secondary min-h-11 w-11 shrink-0 px-0"
              onClick={() => removeValue(index)}
            >
              <Trash2 size={17} aria-hidden="true" />
            </button>
          </div>
        ))}
        {!values.length ? (
          <button type="button" className="button-secondary w-full justify-center" onClick={addValue}>
            <Plus size={16} aria-hidden="true" />
            Añadir elemento
          </button>
        ) : null}
      </div>
    </div>
  );
}

