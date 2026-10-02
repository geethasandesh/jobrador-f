import { useSyncExternalStore } from "react";

export type RouteStop = {
  id: string;
  kind: "job" | "community_lead" | "nearby_business";
  title: string;
  subtitle: string;
  href: string;
};

const ROUTE_KEY = "jobrador.route";
const SAVED_KEY = "jobrador.savedJobs";

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event("jobrador-storage"));
}

export function readRoute(): RouteStop[] {
  const value = readJson<RouteStop[]>(ROUTE_KEY, []);
  return Array.isArray(value) ? value : [];
}

export function addRouteStop(stop: RouteStop) {
  const without = readRoute().filter((item) => item.id !== stop.id);
  writeJson(ROUTE_KEY, [...without, stop]);
}

export function removeRouteStop(id: string) {
  writeJson(
    ROUTE_KEY,
    readRoute().filter((item) => item.id !== id),
  );
}

export function readSavedJobs(): string[] {
  const value = readJson<string[]>(SAVED_KEY, []);
  return Array.isArray(value) ? value : [];
}

export function toggleSavedJob(id: string): boolean {
  const current = readSavedJobs();
  const saved = current.includes(id);
  writeJson(
    SAVED_KEY,
    saved ? current.filter((item) => item !== id) : [...current, id],
  );
  return !saved;
}

export function useClientReady() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener("jobrador-storage", onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener("jobrador-storage", onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

let routeSnapshot: RouteStop[] = [];
let routeRaw: string | null = null;

function routeSnapshotFromStorage(): RouteStop[] {
  const raw = window.localStorage.getItem(ROUTE_KEY);
  if (raw === routeRaw) return routeSnapshot;
  routeRaw = raw;
  try {
    const parsed = raw ? (JSON.parse(raw) as RouteStop[]) : [];
    routeSnapshot = Array.isArray(parsed) ? parsed : [];
  } catch {
    routeSnapshot = [];
  }
  return routeSnapshot;
}

export function useRoute(): RouteStop[] {
  return useSyncExternalStore(subscribe, routeSnapshotFromStorage, () => routeSnapshot);
}

let savedSnapshot: string[] = [];
let savedRaw: string | null = null;

function savedSnapshotFromStorage(): string[] {
  const raw = window.localStorage.getItem(SAVED_KEY);
  if (raw === savedRaw) return savedSnapshot;
  savedRaw = raw;
  try {
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    savedSnapshot = Array.isArray(parsed) ? parsed : [];
  } catch {
    savedSnapshot = [];
  }
  return savedSnapshot;
}

export function useSavedJobs(): string[] {
  return useSyncExternalStore(subscribe, savedSnapshotFromStorage, () => savedSnapshot);
}

export function useJobSaved(id: string): boolean {
  return useSyncExternalStore(
    subscribe,
    () => readSavedJobs().includes(id),
    () => false,
  );
}
