export const USER_NAME_STORAGE_KEY = "podium_user_name";

export function getUserNameFromHeader(
  request: Request,
): string | null {
  const headerName = request.headers.get("x-user-name")?.trim();
  if (headerName) return headerName;
  return null;
}
