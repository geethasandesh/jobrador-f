export function readOrigin(search: { lat?: string | string[]; lng?: string | string[] }) {
  const lat = Array.isArray(search.lat) ? search.lat[0] : search.lat;
  const lng = Array.isArray(search.lng) ? search.lng[0] : search.lng;
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return undefined;
  return { latitude, longitude };
}

export function backToMap(origin?: { latitude: number; longitude: number }) {
  if (!origin) return "/map";
  const params = new URLSearchParams({
    lat: String(origin.latitude),
    lng: String(origin.longitude),
    radiusKm: "5",
  });
  return `/map?${params}`;
}
