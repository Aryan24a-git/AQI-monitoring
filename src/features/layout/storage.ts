// Safe browser localStorage helpers with non-fatal warning logging.

export const STORAGE = {
  profile: 'vayusaathi_profile_v1',
  pledges: 'vayusaathi_pledges_v1',
  hotspots: 'vayusaathi_hotspots_v1',
  upvotes: 'vayusaathi_upvotes_v1',
  lastCity: 'vayusaathi_last_city',
} as const;

/** Reads and parses a JSON value from localStorage, returning fallback on error. */
export function loadStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch (err) {
    console.warn(`Failed to load storage key "${key}"`, err);
    return fallback;
  }
}

/** Persists a string or JSON-serializable value to localStorage. */
export function saveStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  } catch (err) {
    console.warn(`Failed to save storage key "${key}"`, err);
  }
}

/** Removes a key from localStorage, logging a warning if storage is blocked. */
export function removeStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.warn(`Failed to remove storage key "${key}"`, err);
  }
}
