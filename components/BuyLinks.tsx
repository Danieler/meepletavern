import { BrandIcon } from "@/components/BrandIcon";
import type { BuyLink } from "@/lib/catalog";

export function BuyLinks({ links }: { links: BuyLink[] }) {
  if (!links.length) {
    return <p className="text-sm text-ink/60">Sin enlaces de compra añadidos todavía.</p>;
  }

  return (
    <div className="grid gap-2">
      {links.map((link) => (
        <a
          key={`${link.store}-${link.url}`}
          className="button-secondary justify-between"
          href={link.url}
          rel="nofollow sponsored noopener noreferrer"
          target="_blank"
        >
          <span>{link.store}</span>
          <BrandIcon name="tag" size={18} />
        </a>
      ))}
    </div>
  );
}
