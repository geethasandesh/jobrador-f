import { useSyncExternalStore } from "react";
import type { Opportunity } from "./api/types";

const KEY = "jobrador.area-alerts";
const EMPTY: AreaWatch[] = [];

export type AreaWatch = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
  seen: string[];
  primed: boolean;
};

let snapshot: AreaWatch[] = EMPTY;
let raw: string | null = null;

function read(): AreaWatch[] {
  if (typeof window === "undefined") return EMPTY;
  const nextRaw = window.localStorage.getItem(KEY);
  if (nextRaw === raw) return snapshot;
  raw = nextRaw;
  try {
    const value = JSON.parse(nextRaw ?? "[]") as AreaWatch[];
    const list = Array.isArray(value) ? value.filter((item) => item && typeof item.id === "string") : EMPTY;
    snapshot = list.length > 0 ? list : EMPTY;
  } catch {
    snapshot = EMPTY;
  }
  return snapshot;
}

function write(value: AreaWatch[]) {
  window.localStorage.setItem(KEY, JSON.stringify(value.slice(0, 3)));
  window.dispatchEvent(new Event("jobrador-storage"));
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener("jobrador-storage", onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener("jobrador-storage", onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

export function readAreaAlerts() {
  return read();
}

export function useAreaAlerts(): AreaWatch[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function watchId(latitude: number, longitude: number, radiusKm: number) {
  return `${latitude.toFixed(3)}:${longitude.toFixed(3)}:${radiusKm}`;
}

export function sameWatch(watch: AreaWatch, latitude: number, longitude: number, radiusKm: number) {
  return watch.id === watchId(latitude, longitude, radiusKm);
}

export function rememberArea(input: {
  label: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
  seen: string[];
}) {
  const id = watchId(input.latitude, input.longitude, input.radiusKm);
  const next: AreaWatch = { ...input, id, primed: true };
  write([next, ...read().filter((item) => item.id !== id)]);
}

export function forgetArea(id: string) {
  write(read().filter((item) => item.id !== id));
}

export function adoptAreas(areas: Array<{ id: string; label: string; latitude: number; longitude: number; radiusKm: number }>) {
  const current = read();
  const known = new Set(current.map((item) => item.id));
  const extra: AreaWatch[] = areas
    .filter((item) => !known.has(item.id))
    .map((item) => ({ ...item, seen: [], primed: false }));
  if (extra.length === 0) return;
  write([...extra, ...current]);
}

export function replaceArea(watch: AreaWatch) {
  const current = read();
  const existing = current.find((item) => item.id === watch.id);
  if (
    existing &&
    existing.primed === watch.primed &&
    existing.seen.length === watch.seen.length &&
    existing.seen.every((id, index) => id === watch.seen[index])
  ) {
    return;
  }
  write(current.map((item) => (item.id === watch.id ? watch : item)));
}

export function greenPins(items: Opportunity[]) {
  const covered = new Set(
    items.filter((item) => item.kind === "nearby_business" && item.hiring).flatMap((item) => item.linkedJobIds ?? []),
  );
  return items.filter((item) => {
    if (item.kind === "job" && covered.has(item.id)) return false;
    return item.kind === "job" || (item.kind === "nearby_business" && Boolean(item.hiring));
  });
}

export function newsInArea(watch: AreaWatch, items: Opportunity[]) {
  const greens = greenPins(items);
  const ids = greens.map((item) => item.id);
  if (!watch.primed) return { message: null as string | null, watch: { ...watch, primed: true, seen: ids } };
  const fresh = greens.filter((item) => !watch.seen.includes(item.id));
  if (fresh.length === 0) return { message: null as string | null, watch };
  const place = watch.label.replace(/, Berlin$/, "");
  const message =
    fresh.length === 1
      ? `New job in ${place}: ${fresh[0].linkedJobTitle ?? fresh[0].title} at ${fresh[0].businessName}.`
      : `${fresh.length} new jobs in ${place}.`;
  return {
    message,
    watch: { ...watch, seen: [...new Set([...watch.seen, ...ids])] },
  };
}
