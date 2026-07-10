export const DEFAULT_PUBLIC_DISPLAY_NAME = "Jugador de MeepleTavern";

const emailLikePattern = /\b[^\s@]+@[^\s@]+\.[^\s@]+\b/;

export function getSafePublicDisplayName(value: string | null | undefined, fallback = DEFAULT_PUBLIC_DISPLAY_NAME) {
  const normalized = value?.trim().replace(/\s+/g, " ");

  if (!normalized || emailLikePattern.test(normalized)) {
    return fallback;
  }

  return normalized;
}
