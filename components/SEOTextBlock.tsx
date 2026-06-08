type SEOTextBlockProps = {
  title: string;
  children: React.ReactNode;
};

export function SEOTextBlock({ title, children }: SEOTextBlockProps) {
  return (
    <section className="rounded-md border border-ink/10 bg-white p-6 shadow-soft">
      <h2 className="text-2xl font-black text-ink">{title}</h2>
      <div className="mt-4 space-y-4 text-sm leading-7 text-ink/70">{children}</div>
    </section>
  );
}

