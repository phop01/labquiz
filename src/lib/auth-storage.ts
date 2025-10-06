const TOKEN_KEY = "cis-classroom-token";
const USER_KEY = "cis-classroom-user";

export interface StoredUser {
  _id: string;
  firstname: string;
  lastname: string;
  email: string;
  image?: string | null;
  role?: string;
  type?: string;
}

export function saveAuthToken(token: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function saveAuthUser(user: StoredUser) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function saveAuthSession(token: string, user: StoredUser) {
  saveAuthToken(token);
  saveAuthUser(user);
}

export function getAuthToken() {
  if (typeof window === "undefined") return undefined;
  return window.localStorage.getItem(TOKEN_KEY) ?? undefined;
}

export function getAuthUser(): StoredUser | undefined {
  if (typeof window === "undefined") return undefined;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as StoredUser;
  } catch (error) {
    console.warn("Unable to parse stored user", error);
    window.localStorage.removeItem(USER_KEY);
    return undefined;
  }
}

export function clearAuthToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
}

export function clearAuthUser() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(USER_KEY);
}

export function clearAuthSession() {
  clearAuthToken();
  clearAuthUser();
}
