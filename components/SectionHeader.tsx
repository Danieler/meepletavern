type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
};

export function SectionHeader({ eyebrow, title, description }: SectionHeaderProps) {
  return (
    <div className="mb-6 max-w-3xl">
      {eyebrow ? (
        <p className="tavern-eyebrow mb-2">{eyebrow}</p>
      ) : null}
      <div className="flex items-center gap-3">
        <span className="hidden h-px w-10 bg-ember sm:block" />
        <h2 className="tavern-title text-2xl sm:text-3xl">{title}</h2>
      </div>
      {description ? <p className="mt-3 text-base leading-7 text-walnut/80">{description}</p> : null}
    </div>
  );
}
