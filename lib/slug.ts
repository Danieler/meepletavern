const from = "áàäâãåéèëêíìïîóòöôõúùüûñç";
const to = "aaaaaaeeeeiiiiooooouuuunc";

export function slugify(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .split("")
    .map((char) => {
      const index = from.indexOf(char);
      return index >= 0 ? to[index] : char;
    })
    .join("");

  return normalized
    .replace(/&/g, " y ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

