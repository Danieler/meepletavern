import Link from "next/link";
import { termHref } from "@/lib/catalog";

export function MechanicTag({ value }: { value: string }) {
  return (
    <Link
      href={termHref("mechanic", value)}
      className="rounded-md bg-ember/10 px-3 py-1.5 text-sm font-semibold text-ink transition hover:bg-ember"
    >
      {value}
    </Link>
  );
}
