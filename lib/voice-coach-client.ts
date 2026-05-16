import { USER_NAME_STORAGE_KEY } from "@/lib/user-name";

const GUEST_PREFIX = "guest_";

export function getStoredUserName(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(USER_NAME_STORAGE_KEY)?.trim() || null;
}

export function setStoredUserName(name: string): void {
  localStorage.setItem(USER_NAME_STORAGE_KEY, name.trim());
}

function generateGuestIdentity(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${GUEST_PREFIX}${crypto.randomUUID()}`;
  }

  let random = "";
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    random = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 8);
  }

  return `${GUEST_PREFIX}${Date.now().toString(36)}${random}`;
}

export function isAnonymousVoiceCoachUser(name: string | null): boolean {
  if (!name) return false;
  const normalized = name.trim().toLowerCase();
  return normalized === "guest" || normalized.startsWith(GUEST_PREFIX);
}

export function getOrCreateStoredUserName(): string {
  const existing = getStoredUserName();
  if (existing && existing.trim().toLowerCase() !== "guest") return existing;

  const generated = generateGuestIdentity();
  setStoredUserName(generated);
  return generated;
}

export function voiceCoachHeaders(): HeadersInit {
  const userName = getStoredUserName();
  return userName ? { "x-user-name": userName } : {};
}
