type SEOTextBlockProps = {
  title: string;
  children: React.ReactNode;
};

export function SEOTextBlock({ title, children }: SEOTextBlockProps) {
  return (
    <section className="tavern-card p-6">
      <h2 className="tavern-title text-2xl">{title}</h2>
      <div className="mt-4 space-y-4 text-sm leading-7 text-walnut/80">{children}</div>
    </section>
  );
}
