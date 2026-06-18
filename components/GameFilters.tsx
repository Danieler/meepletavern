"use client";

import { useState } from "react";
import Link from "next/link";
import { BrandIcon, type BrandIconName } from "@/components/BrandIcon";
import type { GameFilterInput } from "@/lib/catalog";

type FilterLink = {
  label: string;
  param: keyof GameFilterInput;
  value: string;
};

const filters: Array<{ title: string; icon: BrandIconName; items: FilterLink[] }> = [
  {
    title: "Jugadores",
    icon: "users",
    items: [
      { label: "1", param: "players", value: "1" },
      { label: "2", param: "players", value: "2" },
      { label: "3-4", param: "players", value: "4" },
      { label: "Grupo", param: "players", value: "6" }
    ]
  },
  {
    title: "Duración",
    icon: "clock",
    items: [
      { label: "<30 min", param: "duration", value: "30" },
      { label: "<45 min", param: "duration", value: "45" },
      { label: "<60 min", param: "duration", value: "60" },
      { label: "<120 min", param: "duration", value: "120" },
      { label: "Largos", param: "duration", value: "long" }
    ]
  },
  {
    title: "Dificultad",
    icon: "gauge",
    items: [
      { label: "Ligera", param: "weight", value: "ligero" },
      { label: "Media", param: "weight", value: "medio" },
      { label: "Alta", param: "weight", value: "duro" }
    ]
  },
  {
    title: "Edad",
    icon: "user",
    items: [
      { label: "7+", param: "age", value: "7" },
      { label: "8+", param: "age", value: "8" },
      { label: "10+", param: "age", value: "10" },
      { label: "14+", param: "age", value: "14" }
    ]
  }
];

const sortItems = [
  { label: "Nombre", value: "nombre" },
  { label: "Valoración", value: "valoracion" },
  { label: "Fecha de añadido", value: "fecha" },
  { label: "Dificultad", value: "dificultad" }
];

export function GameFilters({
  active,
  categoryTerms,
  mechanicTerms
}: {
  active: GameFilterInput;
  categoryTerms: string[];
  mechanicTerms: string[];
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [showAllMechanics, setShowAllMechanics] = useState(false);

  const activeCount = Object.entries(active).reduce((acc, [key, value]) => {
    if (key === "page" || key === "sort" || !value) return acc;
    if (Array.isArray(value)) return acc + value.filter(Boolean).length;
    return acc + 1;
  }, 0);

  return (
    <aside className="tavern-card h-fit p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 lg:items-start">
        <div className="min-w-0 lg:block">
          <p className="tavern-eyebrow hidden lg:block">Explorar</p>
          <h2 className="font-display text-xl font-bold text-ink lg:mt-1">Filtros</h2>
        </div>
        
        <div className="flex shrink-0 items-center gap-2">
          {activeCount > 0 && (
            <Link
              className="inline-flex h-9 items-center px-2 text-sm font-bold text-moss transition hover:text-wood hover:underline"
              href="/juegos"
            >
              Limpiar {activeCount > 0 && `(${activeCount})`}
            </Link>
          )}
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-bold transition lg:hidden ${
              isExpanded
                ? "border-walnut/20 bg-paper text-ink"
                : "border-moss/20 bg-moss/5 text-moss shadow-sm"
            }`}
            aria-expanded={isExpanded}
          >
            <BrandIcon name={isExpanded ? "x" : "sliders"} size={16} />
            <span>{isExpanded ? "Cerrar" : "Opciones"}</span>
          </button>
        </div>
      </div>

      <div className={`${isExpanded ? "mt-6 block" : "hidden"} space-y-7 lg:mt-7 lg:block`}>
        {filters.map((group) => (
          <FilterGroup key={group.title} title={group.title} icon={group.icon}>
            {group.items.map((item) => (
              <FilterPill key={`${item.param}-${item.value}`} item={item} active={active} />
            ))}
          </FilterGroup>
        ))}

        <FilterGroup title="Categoría" icon="grid">
          {(showAllCategories ? categoryTerms : categoryTerms.slice(0, 8)).map((term) => (
            <FilterPill key={term} item={{ label: term, param: "category", value: term }} active={active} />
          ))}
          {categoryTerms.length > 8 && (
            <button
              onClick={() => setShowAllCategories(!showAllCategories)}
              className="mt-1 block w-full text-left text-xs font-bold text-moss/60 hover:text-moss underline decoration-moss/20 underline-offset-4"
            >
              {showAllCategories ? "Ver menos" : `Ver todas (${categoryTerms.length})`}
            </button>
          )}
        </FilterGroup>

        <FilterGroup title="Mecánicas" icon="dice">
          {(showAllMechanics ? mechanicTerms : mechanicTerms.slice(0, 7)).map((term) => (
            <FilterPill key={term} item={{ label: term, param: "mechanic", value: term }} active={active} />
          ))}
          {mechanicTerms.length > 7 && (
            <button
              onClick={() => setShowAllMechanics(!showAllMechanics)}
              className="mt-1 block w-full text-left text-xs font-bold text-moss/60 hover:text-moss underline decoration-moss/20 underline-offset-4"
            >
              {showAllMechanics ? "Ver menos" : `Ver todas (${mechanicTerms.length})`}
            </button>
          )}
        </FilterGroup>

        <div className="pt-2 border-t border-walnut/10">
          <FilterGroup title="Ordenar por" icon="sliders">
            {sortItems.map((item) => (
              <FilterPill key={item.value} item={{ label: item.label, param: "sort", value: item.value }} active={active} />
            ))}
          </FilterGroup>
        </div>
      </div>
    </aside>
  );
}

function FilterGroup({ title, icon, children }: { title: string; icon: BrandIconName; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <BrandIcon name={icon} size={14} className="text-walnut/40" />
        <h3 className="tavern-meta !mb-0">{title}</h3>
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </section>
  );
}

function FilterPill({ item, active }: { item: FilterLink; active: GameFilterInput }) {
  const currentValues = getFilterValues(active[item.param]);
  const isMultiSelect = item.param !== "sort";
  const isActive = currentValues.includes(item.value);
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(active)) {
    if (!value || key === item.param) {
      continue;
    }

    appendFilterValues(params, key, value);
  }

  if (isMultiSelect) {
    const nextValues = isActive
      ? currentValues.filter((value) => value !== item.value)
      : [...currentValues, item.value];

    for (const value of nextValues) {
      params.append(item.param, value);
    }
  } else {
    params.set(item.param, item.value);
  }

  return (
    <Link
      href={`/juegos?${params.toString()}`}
      className={`inline-flex min-h-9 items-center rounded-md px-3 py-1.5 text-sm font-extrabold leading-none transition ${
        isActive ? "bg-ink text-white shadow-sm" : "border border-ink/5 bg-ink/5 text-ink/70 hover:border-moss/20 hover:bg-moss/10 hover:text-moss"
      }`}
    >
      {item.label}
    </Link>
  );
}

function getFilterValues(value: GameFilterInput[keyof GameFilterInput]) {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  return typeof value === "string" && value ? [value] : [];
}

function appendFilterValues(params: URLSearchParams, key: string, value: GameFilterInput[keyof GameFilterInput]) {
  if (Array.isArray(value)) {
    for (const entry of value) {
      if (entry) {
        params.append(key, entry);
      }
    }
    return;
  }

  if (typeof value === "string" && value) {
    params.set(key, value);
  }
}
