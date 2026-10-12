const KEY = "ol_sci_admin_token";

export function setAdminSession() {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(KEY, crypto.randomUUID());
}

export function hasAdminSession(): boolean {
  if (typeof window === "undefined") return false;
  return !!sessionStorage.getItem(KEY);
}

export function clearAdminSession() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(KEY);
}