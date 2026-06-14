type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
};

export function SectionHeader({ eyebrow, title, description }: SectionHeaderProps) {
  return (
    <div className="mb-6 max-w-3xl sm:mb-7">
      {eyebrow ? (
        <p className="tavern-eyebrow mb-2">{eyebrow}</p>
      ) : null}
      <div className="flex items-start gap-3">
        <span className="mt-3 hidden h-1.5 w-9 rounded-full bg-ember sm:block" />
        <h2 className="tavern-title text-2xl sm:text-3xl lg:text-4xl">{title}</h2>
      </div>
      {description ? <p className="tavern-copy mt-3 max-w-2xl">{description}</p> : null}
    </div>
  );
}
