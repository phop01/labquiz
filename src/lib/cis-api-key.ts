const STORAGE_KEY = "cis_api_key";
const EMBEDDED_KEY = "70cb991b0e0e520d104fab435a02de14ae262322034694782ebbe314a379ea3f";

let inMemoryKey: string | null = null;

export function setCisApiKey(value: string) {
  inMemoryKey = value;

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // ignore storage errors such as private mode
    }
  }
}

export function getCisApiKey(): string {
  if (inMemoryKey) {
    return inMemoryKey;
  }

  if (typeof window !== "undefined") {
    try {
      const storedValue = window.localStorage.getItem(STORAGE_KEY);
      if (storedValue) {
        inMemoryKey = storedValue;
        return storedValue;
      }
    } catch {
      // ignore
    }
  }

  return EMBEDDED_KEY;
}
