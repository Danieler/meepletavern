import Link from "next/link";
import type { GameFilterInput } from "@/lib/catalog";

type FilterLink = {
  label: string;
  param: keyof GameFilterInput;
  value: string;
};

const filters: Array<{ title: string; items: FilterLink[] }> = [
  {
    title: "Jugadores",
    items: [
      { label: "1", param: "players", value: "1" },
      { label: "2", param: "players", value: "2" },
      { label: "3-4", param: "players", value: "4" },
      { label: "Grupo", param: "players", value: "6" }
    ]
  },
  {
    title: "Duración",
    items: [
      { label: "<30 min", param: "duration", value: "30" },
      { label: "<60 min", param: "duration", value: "60" },
      { label: "<120 min", param: "duration", value: "120" },
      { label: "Largos", param: "duration", value: "long" }
    ]
  },
  {
    title: "Dificultad",
    items: [
      { label: "Ligera", param: "weight", value: "ligero" },
      { label: "Media", param: "weight", value: "medio" },
      { label: "Alta", param: "weight", value: "duro" }
    ]
  },
  {
    title: "Edad",
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
  mechanicTerms,
  themeTerms
}: {
  active: GameFilterInput;
  categoryTerms: string[];
  mechanicTerms: string[];
  themeTerms: string[];
}) {
  return (
    <aside className="tavern-card space-y-5 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="tavern-eyebrow">Explorar</p>
          <h2 className="font-display mt-1 text-xl font-extrabold text-ink">Filtros</h2>
        </div>
        <Link className="mt-1 inline-flex text-sm font-bold text-moss transition hover:text-wood hover:underline" href="/juegos">
          Limpiar filtros
        </Link>
      </div>
      {filters.map((group) => (
        <FilterGroup key={group.title} title={group.title}>
          {group.items.map((item) => (
            <FilterPill key={`${item.param}-${item.value}`} item={item} active={active} />
          ))}
        </FilterGroup>
      ))}
      <FilterGroup title="Categoría">
        {categoryTerms.slice(0, 8).map((term) => (
          <FilterPill key={term} item={{ label: term, param: "category", value: term }} active={active} />
        ))}
      </FilterGroup>
      <FilterGroup title="Mecánicas">
        {mechanicTerms.slice(0, 7).map((term) => (
          <FilterPill key={term} item={{ label: term, param: "mechanic", value: term }} active={active} />
        ))}
      </FilterGroup>
      <FilterGroup title="Temática">
        {themeTerms.slice(0, 7).map((term) => (
          <FilterPill key={term} item={{ label: term, param: "theme", value: term }} active={active} />
        ))}
      </FilterGroup>
      <FilterGroup title="Ordenar por">
        {sortItems.map((item) => (
          <FilterPill key={item.value} item={{ label: item.label, param: "sort", value: item.value }} active={active} />
        ))}
      </FilterGroup>
    </aside>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="tavern-meta">{title}</h3>
      <div className="mt-3 flex flex-wrap gap-2">{children}</div>
    </section>
  );
}

function FilterPill({ item, active }: { item: FilterLink; active: GameFilterInput }) {
  const isActive = active[item.param] === item.value;
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(active)) {
    if (value && key !== item.param) {
      params.set(key, value);
    }
  }
  params.set(item.param, item.value);

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
