export function formatDistance(km: number): string {
  if (km < 1) return `${Math.max(50, Math.round(km * 1000))} m`;
  const digits = km < 10 ? 1 : 0;
  return `${km.toFixed(digits)} km`;
}

export function formatWhen(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return null;
  const minutes = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days < 14) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short" }).format(then);
}

export function mapHref(latitude: number, longitude: number, label?: string) {
  const params = new URLSearchParams({
    lat: String(latitude),
    lng: String(longitude),
    radiusKm: "5",
  });
  if (label) params.set("label", label);
  return `/map?${params}`;
}
