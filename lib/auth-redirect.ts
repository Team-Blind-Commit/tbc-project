export const AUTH_NEXT_KEY = "podium_auth_next";
export const AUTH_MODE_KEY = "podium_auth_mode";

export function buildLoginHref(next?: string, mode?: string): string {
  const params = new URLSearchParams();
  if (next) params.set("next", next);
  if (mode) params.set("mode", mode);
  const query = params.toString();
  return query ? `/login?${query}` : "/login";
}

export function persistAuthRedirect(next?: string | null, mode?: string | null): void {
  if (typeof window === "undefined") return;
  if (next) sessionStorage.setItem(AUTH_NEXT_KEY, next);
  if (mode) sessionStorage.setItem(AUTH_MODE_KEY, mode);
}

export function consumeAuthRedirect(): { next: string; mode: string | null } {
  const next =
    sessionStorage.getItem(AUTH_NEXT_KEY) ??
    "/dashboard";
  const mode = sessionStorage.getItem(AUTH_MODE_KEY);
  sessionStorage.removeItem(AUTH_NEXT_KEY);
  sessionStorage.removeItem(AUTH_MODE_KEY);
  return { next, mode };
}

export function buildPostLoginPath(next: string, mode: string | null): string {
  if (mode && next.startsWith("/voice-coach")) {
    const separator = next.includes("?") ? "&" : "?";
    return `${next}${separator}mode=${encodeURIComponent(mode)}`;
  }
  return next;
}
