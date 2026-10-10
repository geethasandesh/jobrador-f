import { useSyncExternalStore } from "react";
import {
  addLibraryVisit,
  mergeLibrary,
  readLibrary,
  removeLibraryVisit,
  setLibrarySaved,
  type LibraryKind,
} from "./api/client";

export type RouteStop = {
  id: string;
  kind: LibraryKind;
  title: string;
  subtitle: string;
  href: string;
  latitude?: number;
  longitude?: number;
};

export type SavedItem = {
  id: string;
  kind: LibraryKind;
};

const ROUTE_KEY = "jobrador.route";
const SAVED_KEY = "jobrador.savedJobs";
const ADOPT_KEY = "jobrador.library-account";

let persistQueue: Promise<void> = Promise.resolve();

function enqueue(task: () => Promise<void>) {
  persistQueue = persistQueue.then(task).catch(() => undefined);
}

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
  enqueue(() => addLibraryVisit(stop).then(() => undefined));
}

export function removeRouteStop(id: string) {
  writeJson(
    ROUTE_KEY,
    readRoute().filter((item) => item.id !== id),
  );
  enqueue(() => removeLibraryVisit(id).then(() => undefined));
}

function asKind(value: unknown): LibraryKind {
  return value === "community_lead" || value === "nearby_business" ? value : "job";
}

export function readSavedItems(): SavedItem[] {
  const value = readJson<unknown>(SAVED_KEY, []);
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item === "string" && item) return [{ id: item, kind: "job" as const }];
    if (!item || typeof item !== "object") return [];
    const id = (item as { id?: unknown }).id;
    if (typeof id !== "string" || !id) return [];
    return [{ id, kind: asKind((item as { kind?: unknown }).kind) }];
  });
}

export function readSavedJobs(): string[] {
  return readSavedItems().map((item) => item.id);
}

export function toggleSavedJob(id: string, kind: LibraryKind = "job"): boolean {
  const current = readSavedItems();
  const saved = current.some((item) => item.id === id);
  writeJson(
    SAVED_KEY,
    saved ? current.filter((item) => item.id !== id) : [...current, { id, kind }],
  );
  enqueue(() => setLibrarySaved({ id, saved: !saved, kind }).then(() => undefined));
  return !saved;
}

export async function adoptLibrary(accountId: string) {
  const adopted = window.localStorage.getItem(ADOPT_KEY);
  const remote = adopted === accountId
    ? await readLibrary()
    : await mergeLibrary({ saved: readSavedItems(), visits: readRoute() });
  const kept = readRoute();
  writeJson(SAVED_KEY, remote.saved);
  writeJson(
    ROUTE_KEY,
    remote.visits.map((visit) => {
      const local = kept.find((item) => item.id === visit.id);
      if (local?.latitude == null || local.longitude == null) return visit;
      return { ...visit, latitude: local.latitude, longitude: local.longitude };
    }),
  );
  window.localStorage.setItem(ADOPT_KEY, accountId);
}

export function clearLibraryCache() {
  window.localStorage.removeItem(SAVED_KEY);
  window.localStorage.removeItem(ROUTE_KEY);
  window.localStorage.removeItem(ADOPT_KEY);
  window.dispatchEvent(new Event("jobrador-storage"));
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
  savedSnapshot = readSavedJobs();
  return savedSnapshot;
}

export function useSavedJobs(): string[] {
  return useSyncExternalStore(subscribe, savedSnapshotFromStorage, () => savedSnapshot);
}

export function useSavedItems(): SavedItem[] {
  const ids = useSavedJobs();
  const items = readSavedItems();
  if (items.length === ids.length && items.every((item, index) => item.id === ids[index])) return items;
  return ids.map((id) => ({ id, kind: "job" as const }));
}

export function useJobSaved(id: string): boolean {
  return useSyncExternalStore(
    subscribe,
    () => readSavedJobs().includes(id),
    () => false,
  );
}
