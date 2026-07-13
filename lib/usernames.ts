import { getSafeInternalPath } from "@/lib/safeNextPath";

export const GENERATED_USERNAME_PREFIX = "meeple-";
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;

const GENERATED_USERNAME_PATTERN = /^meeple-[a-z0-9]{8}(?:-\d+)?$/;
const USERNAME_PATTERN = /^[a-z0-9_-]+$/;
const RESERVED_USERNAMES = new Set([
  "admin", "api", "juegos", "usuarios", "taberna", "mi-ludoteca",
  "login", "register", "settings", "profile", "account",
  "u", "auth", "legal", "privacy", "cookies", "tavern", "meeple"
]);

export function normalizeUsername(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function isSystemGeneratedUsername(value: string | null | undefined) {
  return Boolean(value && GENERATED_USERNAME_PATTERN.test(value));
}

export function getUsernameValidationError(value: unknown) {
  const username = normalizeUsername(value);
  if (username.length < USERNAME_MIN_LENGTH || username.length > USERNAME_MAX_LENGTH) {
    return `El nombre de usuario debe tener entre ${USERNAME_MIN_LENGTH} y ${USERNAME_MAX_LENGTH} caracteres.`;
  }
  if (!USERNAME_PATTERN.test(username)) {
    return "Solo puede contener letras minúsculas, números, guiones y guiones bajos.";
  }
  if (RESERVED_USERNAMES.has(username) || username.startsWith(GENERATED_USERNAME_PREFIX)) {
    return "Este nombre de usuario no está disponible.";
  }
  return null;
}

export function buildUsernameOnboardingPath(next?: string | null) {
  const safeNext = getSafeInternalPath(next, "/");
  return `/bienvenida/usuario?next=${encodeURIComponent(safeNext)}`;
}
