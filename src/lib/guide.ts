const KEY = "jobrador.guide-seen";

function readIds() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function hasSeenGuide(userId: string) {
  return readIds().includes(userId);
}

export function markGuideSeen(userId: string) {
  const ids = readIds();
  if (ids.includes(userId)) return;
  window.localStorage.setItem(KEY, JSON.stringify([...ids, userId]));
}
