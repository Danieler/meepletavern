export const MIN_TAVERN_MEMBER_QUERY_LENGTH = 2;
export const MAX_TAVERN_MEMBER_QUERY_LENGTH = 40;

export function normalizeTavernMemberSearch(value: unknown) {
  return typeof value === "string"
    ? Array.from(value.trim().replace(/^@/, "").replace(/\s+/g, " ").toLowerCase())
        .slice(0, MAX_TAVERN_MEMBER_QUERY_LENGTH)
        .join("")
    : "";
}
