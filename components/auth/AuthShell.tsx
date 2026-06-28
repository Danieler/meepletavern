import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@/lib/site";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f7f1e6] text-ink">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(217,119,6,0.12),transparent_32%),linear-gradient(135deg,rgba(255,252,245,0.92),rgba(245,234,214,0.78))]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(69,40,26,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(69,40,26,0.14)_1px,transparent_1px)] [background-size:32px_32px]" />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
        <Link href="/" prefetch={false} className="flex min-w-0 items-center gap-2.5">
          <span className="relative inline-flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden sm:h-14 sm:w-14">
            <Image
              src={siteConfig.markImage}
              alt=""
              fill
              sizes="56px"
              className="object-contain"
              priority
            />
          </span>
          <span className="min-w-0">
            <span className="font-display block text-2xl font-bold leading-5 text-wood sm:text-3xl sm:leading-6">
              Meeple
            </span>
            <span className="font-display block text-2xl font-bold leading-5 text-ember sm:text-3xl sm:leading-6">
              Tavern
            </span>
          </span>
        </Link>

        <Link
          href="/"
          prefetch={false}
          className="focus-ring inline-flex min-h-10 shrink-0 items-center rounded-md border border-walnut/15 bg-white/70 px-3 text-xs font-extrabold text-walnut/70 shadow-sm transition hover:border-ember/30 hover:text-wood sm:px-4 sm:text-sm"
        >
          Volver
        </Link>
      </header>

      <div className="relative z-10">{children}</div>
    </div>
  );
}
