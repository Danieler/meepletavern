export function getSafeInternalPath(value: string | null | undefined, fallback = "/mi-perfil") {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || /[\u0000-\u001F\u007F]/.test(value)) {
    return fallback;
  }
  try {
    const base = new URL("https://meepletavern.invalid");
    const resolved = new URL(value, base);
    if (resolved.origin !== base.origin) return fallback;
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return fallback;
  }
}
