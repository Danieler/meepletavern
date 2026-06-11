import { z } from "zod";

export const EDITORIAL_DIFFICULTIES = ["Muy fácil", "Fácil", "Media", "Alta", "Muy alta"] as const;
export const EDITORIAL_CONFIDENCE_LEVELS = ["low", "medium", "high"] as const;

const trimmedString = (max: number) => z.string().trim().max(max);
const optionalTrimmedString = (max: number) => trimmedString(max).nullable().optional().default(null);
const optionalPositiveInt = (max: number) => z.number().int().positive().max(max).nullable().optional().default(null);

const tagArray = (maxItems: number) =>
  z.array(trimmedString(40)).max(maxItems);

const bulletArray = (minItems: number, maxItems: number) =>
  z.array(trimmedString(220)).max(maxItems);

const faqItemSchema = z.object({
  question: trimmedString(140),
  answer: trimmedString(320)
});

export const editorialCompletionSchema = z.object({
  cleanTitle: z.string().trim().max(160).nullable(),
  publisher: optionalTrimmedString(120),
  minPlayers: optionalPositiveInt(20),
  maxPlayers: optionalPositiveInt(20),
  minPlayTime: optionalPositiveInt(600),
  maxPlayTime: optionalPositiveInt(600),
  minAge: optionalPositiveInt(30),
  shortDescription: trimmedString(300),
  longDescription: trimmedString(1200),
  difficulty: z.union([z.enum(EDITORIAL_DIFFICULTIES), z.literal("")]),
  categories: tagArray(5),
  mechanics: tagArray(6),
  themes: tagArray(5),
  bestFor: trimmedString(260),
  notFor: trimmedString(260),
  pros: bulletArray(3, 6),
  cons: bulletArray(2, 5),
  faq: z.array(faqItemSchema).max(6),
  seoTitle: trimmedString(70),
  seoDescription: trimmedString(160),
  confidence: z.enum(EDITORIAL_CONFIDENCE_LEVELS),
  warnings: z.array(trimmedString(220)).max(12)
});

export type EditorialCompletion = z.infer<typeof editorialCompletionSchema>;
