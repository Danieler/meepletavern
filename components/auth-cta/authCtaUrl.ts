export type AuthMode = "login" | "register";

export type AuthContext =
  | "owned"
  | "wishlist"
  | "rating"
  | "list"
  | "comment"
  | "table";

export function buildAuthHref({
  mode = "register",
  next = "/",
  intent,
  authContext
}: {
  mode?: AuthMode;
  next?: string;
  intent?: string;
  authContext?: AuthContext;
}) {
  const params = new URLSearchParams();
  params.set("mode", mode);
  params.set("next", next.startsWith("/") ? next : "/");

  if (intent) {
    params.set("intent", intent);
  }

  if (authContext) {
    params.set("authContext", authContext);
  }

  return `/auth?${params.toString()}`;
}

export function currentPathWithSearch(pathname: string | null, searchParams: URLSearchParams | ReadonlyURLSearchParamsLike | null) {
  const path = pathname || "/";
  const query = searchParams?.toString();
  return query ? `${path}?${query}` : path;
}

type ReadonlyURLSearchParamsLike = {
  toString: () => string;
};
