import Link from "next/link";
import { termHref } from "@/lib/catalog";

export function MechanicTag({ value }: { value: string }) {
  return (
    <Link
      href={termHref("mechanic", value)}
      className="tavern-pill transition hover:border-ember hover:text-wood"
    >
      {value}
    </Link>
  );
}
