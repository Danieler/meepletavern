import { BrandIcon } from "@/components/BrandIcon";
import type { BuyLink } from "@/lib/catalog";

export function BuyLinks({ links }: { links: BuyLink[] }) {
  if (!links.length) {
    return <p className="text-sm text-ink/60">Sin enlaces de compra añadidos todavía.</p>;
  }

  return (
    <div>
      <div className="grid gap-2">
        {links.map((link) => (
          <a
            key={`${link.store}-${link.url}`}
            className="button-secondary min-h-12 justify-between gap-4"
            href={link.url}
            rel="nofollow noopener noreferrer"
            target="_blank"
          >
            <span className="min-w-0 text-left">
              <span className="block break-words leading-tight">{link.store}</span>
              {link.availability ? <span className="block text-xs font-semibold opacity-70">{link.availability}</span> : null}
            </span>
            <span className="inline-flex shrink-0 items-center gap-2">
              {link.priceLabel ? <span>{link.priceLabel}</span> : null}
              <BrandIcon name="tag" size={18} />
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
