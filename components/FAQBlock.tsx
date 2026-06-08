import type { FaqItem } from "@/lib/content";

type FAQBlockProps = {
  faqs: FaqItem[];
};

export function FAQBlock({ faqs }: FAQBlockProps) {
  if (!faqs.length) {
    return null;
  }

  return (
    <section className="space-y-3">
      {faqs.map((faq) => (
        <details
          key={`${faq.question}-${faq.answer}`}
          className="rounded-md border border-ink/10 bg-white p-4 shadow-soft open:border-moss/30"
        >
          <summary className="cursor-pointer text-base font-bold text-ink">{faq.question}</summary>
          <p className="mt-3 text-sm leading-6 text-ink/70">{faq.answer}</p>
        </details>
      ))}
    </section>
  );
}

