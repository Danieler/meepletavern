import Link from "next/link";
import { termHref } from "@/lib/catalog";

export function CategoryTag({ value }: { value: string }) {
  return (
    <Link
      href={termHref("category", value)}
      className="tavern-pill transition hover:border-moss hover:text-moss"
    >
      {value}
    </Link>
  );
}
