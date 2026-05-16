import { USER_NAME_STORAGE_KEY } from "@/lib/user-name";

export function getStoredUserName(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(USER_NAME_STORAGE_KEY)?.trim() || null;
}

export function setStoredUserName(name: string): void {
  localStorage.setItem(USER_NAME_STORAGE_KEY, name.trim());
}

export function voiceCoachHeaders(): HeadersInit {
  const userName = getStoredUserName();
  return userName ? { "x-user-name": userName } : {};
}
