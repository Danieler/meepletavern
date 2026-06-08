import Link from "next/link";
import { termHref } from "@/lib/catalog";

export function CategoryTag({ value }: { value: string }) {
  return (
    <Link
      href={termHref("category", value)}
      className="rounded-md bg-moss/10 px-3 py-1.5 text-sm font-semibold text-moss transition hover:bg-moss hover:text-white"
    >
      {value}
    </Link>
  );
}

