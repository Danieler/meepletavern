import { BrandIcon, type BrandIconName } from "@/components/BrandIcon";

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
  const icon: BrandIconName = tone === "good" ? "star" : "bookmark";
  const iconClass = tone === "good" ? "bg-moss/10 text-moss" : "bg-ruby/10 text-ruby";

  return (
    <section className="tavern-card p-5">
      <h2 className="font-display text-xl font-black text-wood">{title}</h2>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-sm leading-6 text-walnut/80">
            <span className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${iconClass}`}>
              <BrandIcon name={icon} size={18} />
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
