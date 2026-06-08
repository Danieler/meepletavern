import { Check, Minus } from "lucide-react";

type ProsConsProps = {
  pros: string[];
  cons: string[];
};

export function ProsCons({ pros, cons }: ProsConsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <ListPanel title="Pros" items={pros} tone="good" />
      <ListPanel title="Contras" items={cons} tone="bad" />
    </div>
  );
}

function ListPanel({ title, items, tone }: { title: string; items: string[]; tone: "good" | "bad" }) {
  const Icon = tone === "good" ? Check : Minus;
  const iconClass = tone === "good" ? "bg-moss/12 text-moss" : "bg-ruby/12 text-ruby";

  return (
    <section className="rounded-md border border-ink/10 bg-white p-5 shadow-soft">
      <h2 className="text-xl font-bold text-ink">{title}</h2>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-sm leading-6 text-ink/72">
            <span className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${iconClass}`}>
              <Icon size={15} aria-hidden="true" />
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

