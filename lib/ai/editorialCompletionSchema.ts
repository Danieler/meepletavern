import { z } from "zod";

const shortString = (max: number) => z.string().trim().min(1).max(max);

const tagArray = (maxItems: number) =>
  z.array(shortString(40)).min(1).max(maxItems);

const bulletArray = (minItems: number, maxItems: number) =>
  z.array(shortString(220)).min(minItems).max(maxItems);

const faqItemSchema = z.object({
  question: shortString(140),
  answer: shortString(320)
});

export const editorialCompletionSchema = z.object({
  cleanTitle: z.string().trim().min(1).max(160).nullable(),
  shortDescription: shortString(300),
  longDescription: shortString(1200),
  difficulty: z.enum(["Muy fácil", "Fácil", "Media", "Alta", "Muy alta"]),
  categories: tagArray(5),
  mechanics: tagArray(6),
  themes: tagArray(5),
  bestFor: shortString(260),
  notFor: shortString(260),
  pros: bulletArray(3, 6),
  cons: bulletArray(2, 5),
  faq: z.array(faqItemSchema).min(3).max(6),
  seoTitle: shortString(70),
  seoDescription: shortString(160),
  confidence: z.enum(["low", "medium", "high"]),
  warnings: z.array(shortString(220)).max(12)
}).strict();

export type EditorialCompletion = z.infer<typeof editorialCompletionSchema>;
