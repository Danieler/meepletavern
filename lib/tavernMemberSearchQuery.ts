export const MIN_TAVERN_MEMBER_QUERY_LENGTH = 3;
export const MAX_TAVERN_MEMBER_QUERY_LENGTH = 40;

type TavernMemberSearchCandidate = {
  username: string;
  displayName: string;
};

export function normalizeTavernMemberSearch(value: unknown) {
  return typeof value === "string"
    ? Array.from(value.trim().replace(/^@/, "").replace(/\s+/g, " ").toLowerCase())
        .slice(0, MAX_TAVERN_MEMBER_QUERY_LENGTH)
        .join("")
    : "";
}

export function matchesTavernMemberSearch(candidate: TavernMemberSearchCandidate, query: string) {
  const normalizedQuery = normalizeTavernMemberSearch(query);
  if (normalizedQuery.length < MIN_TAVERN_MEMBER_QUERY_LENGTH) return false;

  return normalizeTavernMemberSearch(candidate.username).includes(normalizedQuery)
    || normalizeTavernMemberSearch(candidate.displayName).includes(normalizedQuery);
}

export function canReuseTavernMemberSearchPrefix({
  prefix,
  query,
  resultCount,
  resultLimit
}: {
  prefix: string;
  query: string;
  resultCount: number;
  resultLimit: number;
}) {
  const normalizedPrefix = normalizeTavernMemberSearch(prefix);
  const normalizedQuery = normalizeTavernMemberSearch(query);

  // At exactly three characters the server intentionally searches only a
  // username prefix. From four characters onwards it searches username and
  // display name by containment, so a longer query is a safe subset only then.
  return normalizedPrefix.length > MIN_TAVERN_MEMBER_QUERY_LENGTH
    && normalizedQuery.length > normalizedPrefix.length
    && normalizedQuery.startsWith(normalizedPrefix)
    && resultCount < resultLimit;
}
