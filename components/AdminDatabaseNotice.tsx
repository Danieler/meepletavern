import { Database, ExternalLink } from "lucide-react";
import type { AdminDatabaseError } from "@/lib/adminDatabaseError";

type AdminDatabaseNoticeProps = {
  error: AdminDatabaseError;
};

export function AdminDatabaseNotice({ error }: AdminDatabaseNoticeProps) {
  return (
    <section className="rounded-md border border-ruby/20 bg-white p-6 shadow-soft">
      <div className="flex items-start gap-4">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-ruby/10 text-ruby">
          <Database size={22} aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-2xl font-black text-ink">{error.title}</h2>
          <p className="mt-3 text-sm leading-6 text-ink/70">{error.message}</p>
          {error.target ? (
            <p className="mt-3 rounded-md bg-ink/5 px-3 py-2 text-sm font-semibold text-ink/70">
              Host actual: <code>{error.target}</code>
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-md border border-ink/10 bg-parchment/50 p-4">
          <h3 className="font-black text-ink">En local</h3>
          <p className="mt-2 text-sm leading-6 text-ink/70">
            Arranca una PostgreSQL local o cambia tu `.env` para apuntar a Supabase. Si usas
            Supabase, usa las URLs del pooler.
          </p>
        </div>
        <div className="rounded-md border border-ink/10 bg-parchment/50 p-4">
          <h3 className="font-black text-ink">En Vercel</h3>
          <p className="mt-2 text-sm leading-6 text-ink/70">
            Añade `DATABASE_URL` y `DIRECT_URL` en Environment Variables y redeploya el proyecto.
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-md bg-ink p-4 text-sm text-white">
        <p className="font-bold text-ember">Supabase recomendado</p>
        <pre className="mt-3 overflow-x-auto whitespace-pre-wrap leading-6 text-white/80">
{`DATABASE_URL=postgresql://postgres.PROJECT_REF:PASSWORD@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require
DIRECT_URL=postgresql://postgres.PROJECT_REF:PASSWORD@aws-1-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require`}
        </pre>
      </div>

      <a
        className="button-secondary mt-5"
        href="https://supabase.com/docs/guides/database/prisma"
        target="_blank"
        rel="noreferrer"
      >
        <ExternalLink size={18} aria-hidden="true" />
        Ver guía Supabase + Prisma
      </a>
    </section>
  );
}

