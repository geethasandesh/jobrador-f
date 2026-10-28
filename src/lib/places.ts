export type Place = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
};

export const BERLIN_PLACES: Place[] = [
  { id: "kreuzberg", label: "Kreuzberg, Berlin", latitude: 52.497, longitude: 13.423 },
  { id: "neukolln", label: "Neukölln, Berlin", latitude: 52.481, longitude: 13.435 },
  { id: "mitte", label: "Mitte, Berlin", latitude: 52.522, longitude: 13.405 },
  { id: "wedding", label: "Wedding, Berlin", latitude: 52.543, longitude: 13.366 },
  { id: "friedrichshain", label: "Friedrichshain, Berlin", latitude: 52.515, longitude: 13.454 },
  { id: "charlottenburg", label: "Charlottenburg, Berlin", latitude: 52.516, longitude: 13.304 },
];

export const DEFAULT_PLACE = BERLIN_PLACES[0];

const BERLIN_SOUTH = 52.338;
const BERLIN_NORTH = 52.675;
const BERLIN_WEST = 13.088;
const BERLIN_EAST = 13.761;

export function coversBerlin(latitude: number, longitude: number) {
  return latitude >= BERLIN_SOUTH && latitude <= BERLIN_NORTH && longitude >= BERLIN_WEST && longitude <= BERLIN_EAST;
}

function kmBetween(fromLat: number, fromLng: number, toLat: number, toLng: number) {
  const earth = 6371;
  const lat = ((toLat - fromLat) * Math.PI) / 180;
  const lng = ((toLng - fromLng) * Math.PI) / 180;
  const a =
    Math.sin(lat / 2) ** 2 +
    Math.cos((fromLat * Math.PI) / 180) * Math.cos((toLat * Math.PI) / 180) * Math.sin(lng / 2) ** 2;
  return 2 * earth * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function circleReachesBerlin(latitude: number, longitude: number, radiusKm: number) {
  if (coversBerlin(latitude, longitude)) return true;
  const nearestLat = Math.min(BERLIN_NORTH, Math.max(BERLIN_SOUTH, latitude));
  const nearestLng = Math.min(BERLIN_EAST, Math.max(BERLIN_WEST, longitude));
  return kmBetween(latitude, longitude, nearestLat, nearestLng) <= radiusKm;
}

export const BERLIN_ONLY_MESSAGE =
  "This beta only covers Berlin. We are working on other cities. The map stays on Berlin.";
