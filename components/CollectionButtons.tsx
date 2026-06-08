import { BookOpen, Check, PenLine, Plus } from "lucide-react";

export function CollectionButtons() {
  const buttons = [
    { label: "Añadir a mi colección", icon: Plus },
    { label: "Lo quiero jugar", icon: BookOpen },
    { label: "Lo tengo", icon: Check },
    { label: "Escribir reseña", icon: PenLine }
  ];

  return (
    <div className="grid gap-2">
      {buttons.map((button) => {
        const Icon = button.icon;
        return (
          <button key={button.label} type="button" className="button-secondary justify-start">
            <Icon size={18} aria-hidden="true" />
            {button.label}
          </button>
        );
      })}
    </div>
  );
}

