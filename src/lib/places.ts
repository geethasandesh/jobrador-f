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

export const BERLIN_ONLY_MESSAGE =
  "This service is only in Berlin. We are working to expand it. Thank you.";
