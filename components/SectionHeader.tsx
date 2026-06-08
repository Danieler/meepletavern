type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
};

export function SectionHeader({ eyebrow, title, description }: SectionHeaderProps) {
  return (
    <div className="mb-6 max-w-3xl">
      {eyebrow ? (
        <p className="mb-2 text-xs font-bold uppercase text-ruby">{eyebrow}</p>
      ) : null}
      <h2 className="text-2xl font-bold text-ink sm:text-3xl">{title}</h2>
      {description ? <p className="mt-3 text-base leading-7 text-ink/70">{description}</p> : null}
    </div>
  );
}
