"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Logo } from "@/components/logo";
import { AppContainer } from "@/components/ui/container-scroll-animation";
import { MapCanvas, type MapMarker } from "@/components/map-canvas";
import { OpportunityCard } from "@/components/opportunity-card";
import { PlacePanel } from "@/features/show/explore/place-panel";
import { HowToDialog } from "@/features/show/explore/how-to-dialog";
import { MyPosts } from "@/features/show/report/my-posts";
import { ReportForm } from "@/features/show/report/report-form";
import { MapToast } from "@/components/map-toast";
import { SampleBanner } from "@/components/sample-banner";
import { ApiError, getOpportunities, listAreaAlerts, removeAreaAlert, saveAreaAlert, searchPlaces } from "@/lib/api/client";
import { toggleReferralPanel } from "@/lib/referral-panel";
import type { Kind, OpportunityList } from "@/lib/api/types";
import { markersFromOpportunities } from "@/lib/map-markers";
import {
  CATEGORY_OPTIONS,
  JOB_TYPE_OPTIONS,
  LANGUAGE_OPTIONS,
  SALARY_OPTIONS,
} from "@/lib/labels";
import {
  adoptAreas,
  forgetArea,
  greenPins,
  newsInArea,
  readAreaAlerts,
  rememberArea,
  replaceArea,
  sameWatch,
  useAreaAlerts,
} from "@/lib/area-alerts";
import { removeRouteStop, useClientReady, useRoute, useSavedJobs } from "@/lib/local-lists";
import { hasSeenGuide, markGuideSeen } from "@/lib/guide";
import { signOut, useAuthReady, useSession } from "@/lib/session";
import { BERLIN_ONLY_MESSAGE, DEFAULT_PLACE } from "@/lib/places";

const KINDS: Array<{ id: Kind; label: string }> = [
  { id: "job", label: "Jobs" },
  { id: "community_lead", label: "Leads" },
  { id: "nearby_business", label: "Businesses" },
];

const RADII = ["1", "2", "5", "10"];

function routePoints(
  stops: Array<{ id: string; latitude?: number; longitude?: number }>,
  items: Array<{ id: string; latitude: number; longitude: number }>,
) {
  return stops.flatMap((stop) => {
    if (stop.latitude != null && stop.longitude != null) return [{ latitude: stop.latitude, longitude: stop.longitude }];
    const item = items.find((entry) => entry.id === stop.id);
    return item ? [{ latitude: item.latitude, longitude: item.longitude }] : [];
  });
}

type RoutePoint = { latitude: number; longitude: number };

function kmBetween(from: RoutePoint, to: RoutePoint) {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitude = radians(to.latitude - from.latitude);
  const longitude = radians(to.longitude - from.longitude);
  const haversine =
    Math.sin(latitude / 2) ** 2 +
    Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude)) * Math.sin(longitude / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(haversine)));
}

// Shortest loop that leaves the start, visits every stop once, and comes back.
function roundTrip(start: RoutePoint, stops: RoutePoint[]) {
  const points = [start, ...stops];
  const dist = points.map((from) => points.map((to) => kmBetween(from, to)));
  const order = points.length <= 13 ? exactLoop(dist) : improveLoop(dist, nearestLoop(dist));
  return [...order.map((index) => points[index]!), start];
}

function exactLoop(dist: number[][]) {
  const stops = dist.length - 1;
  const size = 1 << stops;
  const cost = Array.from({ length: size }, () => Array<number>(stops).fill(Number.POSITIVE_INFINITY));
  const previous = Array.from({ length: size }, () => Array<number>(stops).fill(-1));
  for (let stop = 0; stop < stops; stop += 1) cost[1 << stop]![stop] = dist[0]![stop + 1]!;
  for (let seen = 1; seen < size; seen += 1) {
    for (let stop = 0; stop < stops; stop += 1) {
      if ((seen & (1 << stop)) === 0 || !Number.isFinite(cost[seen]![stop]!)) continue;
      for (let next = 0; next < stops; next += 1) {
        if (seen & (1 << next)) continue;
        const nextSeen = seen | (1 << next);
        const nextCost = cost[seen]![stop]! + dist[stop + 1]![next + 1]!;
        if (nextCost < cost[nextSeen]![next]!) {
          cost[nextSeen]![next] = nextCost;
          previous[nextSeen]![next] = stop;
        }
      }
    }
  }
  let end = 0;
  let best = Number.POSITIVE_INFINITY;
  for (let stop = 0; stop < stops; stop += 1) {
    const total = cost[size - 1]![stop]! + dist[stop + 1]![0]!;
    if (total < best) {
      best = total;
      end = stop;
    }
  }
  const sequence: number[] = [];
  let seen = size - 1;
  let stop = end;
  while (stop !== -1) {
    sequence.push(stop + 1);
    const before = previous[seen]![stop]!;
    seen &= ~(1 << stop);
    stop = before;
  }
  return [0, ...sequence.reverse()];
}

function nearestLoop(dist: number[][]) {
  const remaining = new Set(dist.map((_, index) => index).slice(1));
  const order = [0];
  while (remaining.size > 0) {
    const here = order[order.length - 1]!;
    let next = -1;
    let nearest = Number.POSITIVE_INFINITY;
    for (const candidate of remaining) {
      if (dist[here]![candidate]! < nearest) {
        nearest = dist[here]![candidate]!;
        next = candidate;
      }
    }
    order.push(next);
    remaining.delete(next);
  }
  return order;
}

function loopLength(order: number[], dist: number[][]) {
  let total = dist[order[order.length - 1]!]![order[0]!]!;
  for (let index = 0; index < order.length - 1; index += 1) total += dist[order[index]!]![order[index + 1]!]!;
  return total;
}

function improveLoop(dist: number[][], seed: number[]) {
  let order = seed.slice();
  let improved = true;
  while (improved) {
    improved = false;
    for (let start = 1; start < order.length - 1; start += 1) {
      for (let end = start + 1; end < order.length; end += 1) {
        const swapped = order.slice();
        swapped.splice(start, end - start + 1, ...order.slice(start, end + 1).reverse());
        if (loopLength(swapped, dist) + 1e-9 < loopLength(order, dist)) {
          order = swapped;
          improved = true;
        }
      }
    }
  }
  return order;
}

function sameSpot(left: RoutePoint, right: RoutePoint) {
  return Math.abs(left.latitude - right.latitude) < 1e-4 && Math.abs(left.longitude - right.longitude) < 1e-4;
}

function stopsInLoopOrder<T extends { id: string; latitude?: number; longitude?: number }>(
  stops: T[],
  items: Array<{ id: string; latitude: number; longitude: number }>,
  loop: RoutePoint[],
) {
  const located = stops.map((stop) => ({ stop, point: routePoints([stop], items)[0] ?? null }));
  const used = new Set<string>();
  const ordered: T[] = [];
  for (const point of loop.slice(1, -1)) {
    const match = located.find((entry) => entry.point && !used.has(entry.stop.id) && sameSpot(entry.point, point));
    if (!match) continue;
    used.add(match.stop.id);
    ordered.push(match.stop);
  }
  for (const entry of located) if (!used.has(entry.stop.id)) ordered.push(entry.stop);
  return ordered;
}

function walkingRouteUrl(points: Array<{ latitude: number; longitude: number }>) {
  const origin = points[0];
  const destination = points[points.length - 1];
  if (!origin || !destination) return "https://www.google.com/maps";
  const via = points.slice(1, -1).slice(0, 9);
  const url = new URL("https://www.google.com/maps/dir/");
  url.searchParams.set("api", "1");
  url.searchParams.set("travelmode", "walking");
  url.searchParams.set("origin", `${origin.latitude},${origin.longitude}`);
  url.searchParams.set("destination", `${destination.latitude},${destination.longitude}`);
  if (via.length > 0) url.searchParams.set("waypoints", via.map((point) => `${point.latitude},${point.longitude}`).join("|"));
  return url.toString();
}

function param(value: string | null, fallback = "") {
  return value ?? fallback;
}

export function ExploreScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [draftQuery, setDraftQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [locating, setLocating] = useState(false);
  const [recentPlaces, setRecentPlaces] = useState<SearchPlace[]>([]);  const [placeHits, setPlaceHits] = useState<SearchPlace[]>([]);
  const [searching, setSearching] = useState(true);
  const [data, setData] = useState<OpportunityList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [jobAlert, setJobAlert] = useState<{
    text: string;
    latitude: number;
    longitude: number;
    radiusKm: number;
    label: string;
  } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [pinnedKind, setPinnedKind] = useState<Kind | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [panel, setPanel] = useState<"list" | "filters" | "visits" | "report" | "post" | "mine" | null>(null);
  const [routeLine, setRouteLine] = useState<Array<{ latitude: number; longitude: number }> | null>(null);
  const [savedOnly, setSavedOnly] = useState(false);
  const ready = useClientReady();
  const authReady = useAuthReady();
  const session = useSession();
  const savedIds = useSavedJobs();
  const areaAlerts = useAreaAlerts();
  const stops = useRoute();
  const visitCount = ready ? stops.length : 0;
  const savedCount = ready ? savedIds.length : 0;

  const requestedPanel = searchParams.get("panel");
  const [seenPanel, setSeenPanel] = useState<string | null>(null);
  if (requestedPanel !== seenPanel) {
    setSeenPanel(requestedPanel);
    if (requestedPanel === "visits") setPanel("visits");
    if (requestedPanel === "report" || requestedPanel === "share") setPanel("report");
    if (requestedPanel === "post") setPanel("post");
    if (requestedPanel === "mine") setPanel("mine");
    if (requestedPanel === "saved") {
      setPanel("list");
      setSavedOnly(true);
    }
  }

  const latitude = Number(searchParams.get("lat") ?? DEFAULT_PLACE.latitude);
  const longitude = Number(searchParams.get("lng") ?? DEFAULT_PLACE.longitude);
  const radiusKm = Number(searchParams.get("radiusKm") ?? "5");
  const label = param(searchParams.get("label"), "Kreuzberg, Berlin");
  const q = param(searchParams.get("q"));
  const jobType = param(searchParams.get("jobType"));
  const category = param(searchParams.get("category"));
  const language = param(searchParams.get("language"));
  const salary = param(searchParams.get("salary"));
  const sort = param(searchParams.get("sort"), "distance");
  const kinds = searchParams.get("kinds");
  const filtersKey = `${searchParams.toString()}#${reloadKey}`;
  const [requestKey, setRequestKey] = useState(filtersKey);
  const [loading, setLoading] = useState(true);

  if (requestKey !== filtersKey) {
    setRequestKey(filtersKey);
    setLoading(true);
    setSearching(true);
    setError(null);
  }

  useEffect(() => {
    const query = draftQuery.trim();
    if (query.length < 2 || query === label) {
      setPlaceHits([]);
      return;
    }
    const controller = new AbortController();
    const handle = window.setTimeout(() => {
      searchPlaces(query, controller.signal)
        .then((result) => {
          if (controller.signal.aborted) return;
          setPlaceHits(result.places);
          if (result.outsideBerlin) setToast(BERLIN_ONLY_MESSAGE);
        })
        .catch(() => {
          if (!controller.signal.aborted) setPlaceHits([]);
        });
    }, 250);
    return () => {
      controller.abort();
      window.clearTimeout(handle);
    };
  }, [draftQuery, label]);

  function choosePlace(place: SearchPlace) {
    setDraftQuery(place.label);
    setPlaceHits([]);
    setSearchFocused(false);
    setRecentPlaces(rememberPlace(place));
    setNotice(null);
    setToast(null);
    update({
      lat: String(place.latitude),
      lng: String(place.longitude),
      label: place.label,
      q: null,
    });
  }

  function update(patch: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams.toString());
    if (!next.get("lat")) next.set("lat", String(DEFAULT_PLACE.latitude));
    if (!next.get("lng")) next.set("lng", String(DEFAULT_PLACE.longitude));
    if (!next.get("radiusKm")) next.set("radiusKm", "5");
    for (const [key, value] of Object.entries(patch)) {
      if (!value) next.delete(key);
      else next.set(key, value);
    }
    router.replace(`/map?${next.toString()}`, { scroll: false });
  }

  const guideRequested = searchParams.get("guide") === "1";
  const userId = session?.id;
  const showGuide = Boolean(authReady && userId && guideRequested && !hasSeenGuide(userId));

  function dismissGuide(openPost = false) {
    if (session?.id) markGuideSeen(session.id);
    if (openPost) setPanel("post");
    update({ guide: null });
  }

  useEffect(() => {
    if (!authReady || !session?.id || !guideRequested || !hasSeenGuide(session.id)) return;
    update({ guide: null });
  }, [authReady, guideRequested, session?.id]);

  useEffect(() => {
    if (!session?.id) return;
    let cancelled = false;
    void listAreaAlerts()
      .then((result) => {
        if (!cancelled) adoptAreas(result.alerts);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [session?.id]);

  useEffect(() => {
    const controller = new AbortController();
    const timers: number[] = [];
    const filters = {
      latitude,
      longitude,
      radiusKm: Number.isFinite(radiusKm) ? radiusKm : 5,
      q: q || undefined,
      jobType: jobType || undefined,
      category: category || undefined,
      kinds: kinds || undefined,
      language: language || undefined,
      salary: salary || undefined,
      sort,
    };
    getOpportunities(filters, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setData(result);
        setError(null);
        setLoading(false);
        setSearching(false);
        if (result.items.some((item) => item.status === "UNCHECKED")) {
          for (const delay of [12000, 28000, 50000]) {
            timers.push(
              window.setTimeout(() => {
                getOpportunities(filters, controller.signal)
                  .then((next) => {
                    if (!controller.signal.aborted) setData(next);
                  })
                  .catch(() => undefined);
              }, delay),
            );
          }
        }
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted) return;
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        setLoading(false);
        setSearching(false);
        setError(caught instanceof ApiError ? caught.message : "Could not load the map.");
      });
    return () => {
      controller.abort();
      for (const timer of timers) window.clearTimeout(timer);
    };
  }, [filtersKey, reloadKey, latitude, longitude, radiusKm, q, jobType, category, kinds, language, salary, sort]);

  const openedPin = useRef<string | null>(null);
  const pin = searchParams.get("pin");
  useEffect(() => {
    if (!pin || !data || openedPin.current === pin) return;
    if (!data.items.some((item) => item.id === pin)) return;
    openedPin.current = pin;
    setSelectedId(pin);
    setDetailsId(null);
    setPanel(null);
  }, [pin, data]);

  useEffect(() => {
    if (!data) return;
    const watches = readAreaAlerts();
    if (watches.length === 0) return;
    let cancelled = false;
    void (async () => {
      for (const watch of watches) {
        const items = sameWatch(watch, latitude, longitude, radiusKm)
          ? data.items
          : (
              await getOpportunities({
                latitude: watch.latitude,
                longitude: watch.longitude,
                radiusKm: watch.radiusKm,
              })
            ).items;
        if (cancelled) return;
        const result = newsInArea(watch, items);
        replaceArea(result.watch);
        if (result.message) {
          setJobAlert({
            text: result.message,
            latitude: watch.latitude,
            longitude: watch.longitude,
            radiusKm: watch.radiusKm,
            label: watch.label,
          });
          return;
        }
      }
    })().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [data, latitude, longitude, radiusKm]);

  const activeKinds = useMemo(() => {
    if (!kinds) return KINDS.map((kind) => kind.id);
    return kinds.split(",").filter(Boolean) as Kind[];
  }, [kinds]);

  const markers: MapMarker[] = useMemo(
    () =>
      markersFromOpportunities(data?.items ?? [], (item) => {
        const params = new URLSearchParams({
          lat: String(latitude),
          lng: String(longitude),
        });
        const path =
          item.kind === "job" ? "jobs" : item.kind === "community_lead" ? "leads" : "businesses";
        return `/${path}/${item.id}?${params}`;
      }),
    [data, latitude, longitude],
  );

  function toggleKind(kind: Kind) {
    const next = activeKinds.includes(kind)
      ? activeKinds.filter((item) => item !== kind)
      : [...activeKinds, kind];
    if (next.length === 0) return;
    update({ kinds: next.length === KINDS.length ? null : next.join(",") });
  }

  function goToMyLocation() {
    setSearchFocused(false);
    if (!navigator.geolocation || !window.isSecureContext) {
      setToast("This page cannot read your location. Type a Berlin area instead.");
      return;
    }
    setLocating(true);
    setToast("Finding your location…");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        const nextLatitude = position.coords.latitude;
        const nextLongitude = position.coords.longitude;
        const inside =
          nextLatitude >= 52.33 && nextLatitude <= 52.68 && nextLongitude >= 13.05 && nextLongitude <= 13.77;
        if (!inside) {
          setToast(BERLIN_ONLY_MESSAGE);
          return;
        }
        setNotice(null);
        setToast(null);
        setDraftQuery("");
        setPlaceHits([]);
        update({
          lat: String(nextLatitude),
          lng: String(nextLongitude),
          label: "Your location",
          q: null,
        });
      },
      () => {
        setLocating(false);
        setToast("Location was blocked. Allow it in the browser, or type a Berlin area.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }

  const filtersActive = Boolean(q || jobType || category || language || salary || kinds);
  const visibleItems = savedOnly
    ? (data?.items ?? []).filter((item) => savedIds.includes(item.id))
    : (data?.items ?? []);
  const selected = (data?.items ?? []).find((item) => item.id === selectedId) ?? null;
  const panelId = detailsId ?? selectedId;
  const panelItem = (data?.items ?? []).find((item) => item.id === panelId) ?? null;
  const panelKind =
    panelItem?.kind ?? stops.find((stop) => stop.id === panelId)?.kind ?? (panelId === detailsId ? pinnedKind : null);
  const panelTarget = panelId && panelKind ? { id: panelId, kind: panelKind, item: panelItem } : null;

  function togglePanel(next: "list" | "filters" | "visits" | "report" | "post" | "mine") {
    setPanel((current) => (current === next ? null : next));
  }

  function openDetails(id: string, kind: Kind) {
    setSelectedId(id);
    setDetailsId(id);
    setPinnedKind(kind);
    setPanel(null);
  }

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden overscroll-none bg-white px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:static sm:h-dvh sm:px-10 sm:py-3 md:px-16">
      <div className="mb-2 flex flex-col gap-2 sm:mb-3 sm:flex-row sm:items-center">
        <div className="hidden shrink-0 sm:block">
          <Logo compact href="/map" />
        </div>
        <div className="flex min-w-0 items-center gap-2 sm:contents">
        <div className="shrink-0 sm:hidden">
          <Logo compact href="/map" />
        </div>
        <div className="relative min-w-0 flex-1">
        <form
          className="flex min-w-0 items-center gap-2 rounded-full border border-line bg-white py-1 pl-3 pr-1 shadow-[0_8px_30px_rgba(17,17,17,0.08)]"
          onSubmit={(event) => {
            event.preventDefault();
            const query = draftQuery.trim();
            if (query.length < 2) return;
            setToast("Searching…");
            void searchPlaces(query)
              .then((result) => {
                if (result.outsideBerlin) {
                  setPlaceHits([]);
                  setToast(BERLIN_ONLY_MESSAGE);
                  return;
                }
                const place = result.places[0];
                if (!place) {
                  setToast("No Berlin place matched that name.");
                  return;
                }
                choosePlace(place);
              })
              .catch(() => setToast("Search did not go through. Try that Berlin name again."));
          }}
        >
          <span className="sr-only">Search a Berlin area</span>
          <SearchIcon />
          <input
            value={draftQuery}
            onChange={(event) => {
              setDraftQuery(event.target.value);
              setToast(null);
            }}
            onFocus={(event) => {
              setSearchFocused(true);
              setRecentPlaces(readRecentPlaces());
              event.target.select();
            }}
            onBlur={() => setSearchFocused(false)}
            placeholder="Postal code or area in Berlin"
            className="min-w-0 flex-1 bg-transparent py-1.5 text-sm outline-none"
          />
          {draftQuery ? (
            <button
              type="button"
              className="px-2 text-muted"
              onClick={() => {
                setDraftQuery("");
                setPlaceHits([]);
              }}
              aria-label="Clear search"
            >
              ×
            </button>
          ) : null}
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={goToMyLocation}
            disabled={locating}
            aria-label="Use my location"
            title="Use my location"
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${locating ? "animate-pulse bg-zinc-100 text-ink" : "text-ink hover:bg-zinc-100"}`}
          >
            <LocateIcon />
          </button>
        </form>
        {searchFocused || placeHits.length > 0 ? (
          <ul className="absolute top-[calc(100%+6px)] right-0 left-0 z-[800] max-h-[60dvh] overflow-y-auto overscroll-contain rounded-2xl border border-line bg-white py-1 shadow-lg">
            <li>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  (document.activeElement as HTMLElement | null)?.blur();
                  goToMyLocation();
                }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-semibold text-[#3b82f6] hover:bg-zinc-50"
              >
                <LocateIcon />
                Your location
              </button>
            </li>
            {!draftQuery.trim() && recentPlaces.length > 0 ? (
              <>
                <li className="flex items-center justify-between px-4 pt-2 pb-1 text-[11px] font-semibold tracking-wide text-muted uppercase">
                  Recent
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => setRecentPlaces(clearRecentPlaces())}
                    className="normal-case tracking-normal hover:text-ink"
                  >
                    Clear
                  </button>
                </li>
                {recentPlaces.map((place) => (
                  <PlaceRow key={`recent-${place.label}`} place={place} icon={<ClockIcon />} onChoose={choosePlace} />
                ))}
              </>
            ) : null}
            {placeHits.map((place) => (
              <PlaceRow key={`${place.label}-${place.latitude}`} place={place} icon={<PinIcon />} onChoose={choosePlace} />
            ))}
          </ul>
        ) : null}
        </div>
        </div>
        <div className="grid shrink-0 grid-cols-4 gap-1.5 sm:flex sm:gap-2">
          <button
            type="button"
            onClick={() => {
              setSelectedId(null);
              setDetailsId(null);
              setPinnedKind(null);
              setPanel("post");
            }}
            className={`inline-flex w-full shrink-0 items-center justify-center gap-1.5 rounded-full border border-line px-2 py-2 text-xs font-semibold shadow-sm sm:w-auto sm:px-3 sm:text-sm sm:font-medium ${panel === "post" ? "bg-zinc-100 text-ink" : "bg-white text-muted"}`}
          >
            <BriefcaseIcon />
            <span className="hidden sm:inline">Post a job</span>
            <span className="sm:hidden">Post</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedId(null);
              setDetailsId(null);
              setPinnedKind(null);
              setPanel("report");
            }}
            className={`hidden shrink-0 items-center gap-1.5 rounded-full border border-line px-3 py-2 text-sm font-medium shadow-sm sm:inline-flex ${panel === "report" ? "bg-zinc-100 text-ink" : "bg-white text-muted"}`}
          >
            <FlagIcon />
            <span className="hidden sm:inline">Share a tip</span>
            <span className="sm:hidden">Tip</span>
          </button>
          <button
            type="button"
            onClick={() => setPanel("mine")}
            className="hidden rounded-full border border-line bg-white px-3 py-2 text-sm font-medium shadow-sm sm:inline-flex"
          >
            Your posts
          </button>
          <button type="button" onClick={() => toggleReferralPanel()} className="w-full shrink-0 rounded-full border border-line bg-white px-2 py-2 text-xs font-semibold shadow-sm sm:w-auto sm:px-3 sm:text-sm sm:font-medium">
            Referrals
          </button>
          <button
            type="button"
            onClick={() => {
              setSavedOnly(true);
              setPanel("list");
            }}
            className="w-full shrink-0 rounded-full border border-line bg-white px-2 py-2 text-xs font-semibold shadow-sm sm:w-auto sm:px-3 sm:text-sm sm:font-medium"
          >
            Saved <span className="text-muted">{savedCount}</span>
          </button>
          <button
            type="button"
            onClick={() => togglePanel("visits")}
            className="hidden shrink-0 rounded-full border border-line bg-white px-3 py-2 text-sm font-medium shadow-sm sm:inline-flex"
          >
            Visit list <span className="text-muted">{visitCount}</span>
          </button>
          {session ? (
            <button
              type="button"
              onClick={() => {
                void signOut().then(() => router.push("/"));
              }}
              className="w-full shrink-0 rounded-full bg-ink px-2 py-2 text-xs font-semibold text-white shadow-sm sm:w-auto sm:px-3 sm:text-sm sm:font-medium"
            >
              Log out
            </button>
          ) : null}
        </div>
      </div>

      <AppContainer className="min-h-0 flex-1">
      <div className="explore-map relative h-full min-h-0 bg-[#efeae3]">
      <MapCanvas
        center={{ latitude, longitude }}
        radiusKm={Number.isFinite(radiusKm) ? radiusKm : 5}
        markers={markers}
        selectedId={selectedId}
        route={routeLine}
        onSelect={(id) => {
          setSelectedId(id);
          setDetailsId(null);
          setPinnedKind(null);
          setPanel(null);
        }}
        onPick={(nextLatitude, nextLongitude) => {
          const inside =
            nextLatitude >= 52.33 && nextLatitude <= 52.68 && nextLongitude >= 13.05 && nextLongitude <= 13.77;
          if (!inside) {
            setToast(BERLIN_ONLY_MESSAGE);
            return;
          }
          setNotice(null);
          setToast(null);
          setDraftQuery("");
          update({
            lat: nextLatitude.toFixed(5),
            lng: nextLongitude.toFixed(5),
            label: "Chosen spot, Berlin",
            q: null,
          });
        }}
      />

      <div className="absolute inset-x-3 top-3 z-[700] flex flex-col items-center gap-2 sm:inset-x-24 sm:top-4">
        <MapToast message={toast} />
        {routeLine ? (
          <div className="flex items-center gap-2 rounded-full bg-white py-1 pr-1 pl-4 text-sm font-semibold shadow-sm">
            Round trip
            <a
              href={walkingRouteUrl(routeLine)}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-ink px-3 py-1.5 text-white"
            >
              Open in Maps
            </a>
            <button type="button" onClick={() => setRouteLine(null)} className="rounded-full px-3 py-1.5 text-muted" aria-label="Hide route">
              Hide
            </button>
          </div>
        ) : null}
        <SampleBanner dataSource={data?.dataSource} />
        {jobAlert ? (
          <div className="flex max-w-[min(100%,24rem)] items-center gap-2 rounded-full bg-white py-1 pr-1 pl-4 text-sm font-semibold shadow-sm">
            <span className="min-w-0 flex-1 py-1 text-left">{jobAlert.text}</span>
            <button
              type="button"
              onClick={() => {
                update({
                  lat: jobAlert.latitude.toFixed(5),
                  lng: jobAlert.longitude.toFixed(5),
                  radiusKm: String(jobAlert.radiusKm),
                  label: jobAlert.label,
                  q: null,
                  pin: null,
                });
                setJobAlert(null);
              }}
              className="rounded-full bg-ink px-3 py-1.5 text-white"
            >
              Show
            </button>
            <button type="button" onClick={() => setJobAlert(null)} className="rounded-full px-3 py-1.5 text-muted">
              Hide
            </button>
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => {
          const existing = areaAlerts.find((watch) => sameWatch(watch, latitude, longitude, radiusKm));
          const place = label.replace(/, Berlin$/, "");
          if (existing) {
            forgetArea(existing.id);
            void removeAreaAlert(existing.id).catch(() => undefined);
            setToast(null);
            return;
          }
          if (!session?.email) {
            setToast("Log in so we can email you.");
            return;
          }
          const radius = Number.isFinite(radiusKm) ? radiusKm : 5;
          rememberArea({
            label,
            latitude,
            longitude,
            radiusKm: radius,
            seen: greenPins(data?.items ?? []).map((item) => item.id),
          });
          void saveAreaAlert({ label, latitude, longitude, radiusKm: radius })
            .then(() => setToast(`We'll email ${session.email} when a new job appears in ${place}.`))
            .catch(() => setToast("Alert is on this device. The email could not be saved yet."));
        }}
        className="absolute bottom-20 left-1/2 z-[700] -translate-x-1/2 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold shadow-sm sm:bottom-6"
      >
        {areaAlerts.some((watch) => sameWatch(watch, latitude, longitude, radiusKm)) ? "Alerts on" : "Alert me here"}
      </button>

      {searching ? <MapSearchPulse /> : null}

      <nav className="absolute top-4 left-3 z-[700] hidden w-16 flex-col items-center gap-1 rounded-2xl bg-white py-2 text-[10px] font-medium text-muted shadow-[0_10px_30px_rgba(17,17,17,0.1)] sm:flex">
        <RailButton label="Discover" active={panel === null} onClick={() => setPanel(null)}>
          <CompassIcon />
        </RailButton>
        <RailButton label="List" active={panel === "list"} onClick={() => togglePanel("list")}>
          <ListIcon />
        </RailButton>
        <RailButton label="Filters" active={panel === "filters"} onClick={() => togglePanel("filters")}>
          <FilterIcon />
        </RailButton>
        <RailButton
          label="Post"
          active={panel === "post"}
          onClick={() => {
            setSelectedId(null);
            setDetailsId(null);
            setPinnedKind(null);
            togglePanel("post");
          }}
        >
          <BriefcaseIcon />
        </RailButton>
        <RailButton
          label="Share"
          active={panel === "report"}
          onClick={() => {
            setSelectedId(null);
            setDetailsId(null);
            setPinnedKind(null);
            togglePanel("report");
          }}
        >
          <FlagIcon />
        </RailButton>
      </nav>

      {panel ? (
        <aside className={`absolute inset-x-2 top-2 z-[700] flex flex-col overflow-hidden rounded-3xl bg-white shadow-[0_18px_50px_rgba(17,17,17,0.16)] sm:inset-x-auto sm:top-4 sm:left-24 sm:w-[min(100%-1.5rem,360px)] ${panel === "filters" || panel === "visits" || panel === "report" || panel === "post" ? "max-h-[calc(100%-5.5rem)] sm:max-h-[calc(100%-2rem)]" : "bottom-20 sm:bottom-6"}`}>
          {panel === "post" ? (
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold tracking-tight">Post a job</h2>
                <button type="button" className="text-xl leading-none text-muted" onClick={() => setPanel(null)} aria-label="Close">
                  ×
                </button>
              </div>
                <ReportForm
                  embedded
                  purpose="business"
                  areaLabel={label}
                  latitude={latitude}
                  longitude={longitude}
                  onCreated={(lead) => {
                    setPanel("mine");
                    setSelectedId(lead.id);
                    setDetailsId(lead.id);
                    setPinnedKind("community_lead");
                    setReloadKey((value) => value + 1);
                    update({
                      lat: String(lead.latitude),
                      lng: String(lead.longitude),
                      label: lead.area,
                      panel: null,
                      guide: null,
                    });
                  }}
                />
                <button type="button" className="text-sm font-semibold" onClick={() => setPanel("mine")}>
                  Your posts
                </button>
            </div>
          ) : panel === "mine" ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex items-center justify-between px-4 pt-4">
                <h2 className="text-lg font-bold tracking-tight">Your posts</h2>
                <button type="button" className="text-xl leading-none text-muted" onClick={() => setPanel(null)} aria-label="Close">
                  ×
                </button>
              </div>
              <p className="px-4 pt-1 text-sm text-muted">Stop hiring or delete a job you posted.</p>
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                <MyPosts
                  onChanged={() => setReloadKey((value) => value + 1)}
                  onOpen={(post) => {
                    setSelectedId(post.id);
                    setDetailsId(post.id);
                    setPinnedKind("community_lead");
                    update({
                      lat: String(post.latitude),
                      lng: String(post.longitude),
                      label: post.area,
                    });
                  }}
                />
              </div>
            </div>
          ) : panel === "report" ? (
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold tracking-tight">Share a tip</h2>
                <button type="button" className="text-xl leading-none text-muted" onClick={() => setPanel(null)} aria-label="Close">
                  ×
                </button>
              </div>
                <ReportForm
                  embedded
                  areaLabel={label}
                  latitude={latitude}
                  longitude={longitude}
                  onCreated={(lead) => {
                    setPanel(null);
                    setSelectedId(lead.id);
                    setDetailsId(lead.id);
                    setPinnedKind("community_lead");
                    setReloadKey((value) => value + 1);
                    update({
                      lat: String(lead.latitude),
                      lng: String(lead.longitude),
                      label: lead.area,
                      panel: null,
                    });
                  }}
                />
            </div>
          ) : panel === "visits" ? (
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold tracking-tight">Visit list</h2>
                <button type="button" className="text-xl leading-none text-muted" onClick={() => setPanel(null)} aria-label="Close visit list">
                  ×
                </button>
              </div>
              {stops.length === 0 ? (
                <p className="text-sm text-muted">No stops yet. Add them from a place.</p>
              ) : (
                <>
                  {stops.length >= 2 ? (
                  <button
                    type="button"
                    onClick={() => {
                      const points = routePoints(stops, data?.items ?? []);
                      if (points.length < 2) {
                        setToast(points.length === 0 ? "These stops have no map point yet. Add them again from the map." : "Add one more stop to get a route.");
                        return;
                      }
                      if (points.length < stops.length) setToast("Some stops have no map point, so the route skips them.");
                      else if (points.length > 9) setToast("Maps opens the first 9 stops. The line shows the full round trip.");
                      setRouteLine(roundTrip({ latitude, longitude }, points));
                      setPanel(null);
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-ink py-2.5 text-sm font-semibold text-white"
                  >
                    <RouteIcon />
                    Get route
                  </button>
                  ) : null}
                  {(routeLine ? stopsInLoopOrder(stops, data?.items ?? [], routeLine) : stops).map((stop, index) => (
                    <div key={stop.id} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openDetails(stop.id, stop.kind)}
                        className="flex min-w-0 flex-1 items-center gap-3 py-1 text-left"
                      >
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-zinc-100 text-xs font-bold">{index + 1}</span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">{stop.title}</span>
                          <span className="block truncate text-xs text-muted">{stop.subtitle}</span>
                        </span>
                      </button>
                      <button
                        type="button"
                        className="px-2 text-lg leading-none text-muted"
                        aria-label={`Remove ${stop.title}`}
                        onClick={() => {
                          removeRouteStop(stop.id);
                          setRouteLine(null);
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
          ) : panel === "filters" ? (
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold tracking-tight">Filters</h2>
                <div className="flex items-center gap-3">
                  {filtersActive ? (
                    <button type="button" className="text-sm font-semibold text-muted" onClick={() => update({ q: null, jobType: null, category: null, language: null, salary: null, kinds: null })}>
                      Reset
                    </button>
                  ) : null}
                  <button type="button" className="text-xl leading-none text-muted" onClick={() => setPanel(null)} aria-label="Close filters">
                    ×
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={goToMyLocation}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-zinc-100 py-2.5 text-sm font-semibold"
              >
                <LocateIcon />
                Use my location
              </button>
              {notice ? <p className="text-sm text-place">{notice}</p> : null}
              <div className="grid grid-cols-4 gap-1 rounded-full bg-zinc-100 p-1" role="group" aria-label="Distance">
                {RADII.map((radius) => (
                  <button
                    key={radius}
                    type="button"
                    aria-pressed={String(radiusKm) === radius}
                    onClick={() => update({ radiusKm: radius })}
                    className={`rounded-full py-1.5 text-sm ${String(radiusKm) === radius ? "bg-white font-semibold shadow-sm" : "text-muted"}`}
                  >
                    {radius} km
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-1 rounded-full bg-zinc-100 p-1" role="group" aria-label="What to show">
                {KINDS.map((kind) => (
                  <button
                    key={kind.id}
                    type="button"
                    aria-pressed={activeKinds.includes(kind.id)}
                    onClick={() => toggleKind(kind.id)}
                    className={`rounded-full py-1.5 text-sm ${activeKinds.includes(kind.id) ? "bg-white font-semibold shadow-sm" : "text-muted"}`}
                  >
                    {kind.label}
                  </button>
                ))}
              </div>
              <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1" role="group" aria-label="Place type">
                {CATEGORY_OPTIONS.map((option) => {
                  const active = category === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => update({ category: active ? null : option.value })}
                      className={`flex w-16 shrink-0 flex-col items-center gap-1 rounded-2xl px-1 py-2 ${active ? "bg-ink text-white" : "bg-zinc-100 text-ink"}`}
                    >
                      <CategoryIcon name={option.value} />
                      <span className="text-center text-[11px] leading-tight">{option.value === "customer_service" ? "Service" : option.label}</span>
                    </button>
                  );
                })}
              </div>
              <div className="grid gap-2">
                <select className="field" aria-label="Job type" value={jobType} onChange={(event) => update({ jobType: event.target.value || null })}>
                  <option value="">Any job type</option>
                  {JOB_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <select className="field" aria-label="Language" value={language} onChange={(event) => update({ language: event.target.value || null })}>
                  <option value="">Any language</option>
                  {LANGUAGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <select className="field" aria-label="Salary" value={salary} onChange={(event) => update({ salary: event.target.value || null })}>
                  <option value="">Any salary</option>
                  {SALARY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex items-center justify-between gap-3 px-4 pt-4">
                <div>
                  <h2 className="text-lg font-bold tracking-tight">{label.split(",")[0]}</h2>
                  <p className="text-sm text-muted">{loading || searching ? "Detecting…" : `${visibleItems.length} places`}</p>
                </div>
                <button type="button" className="text-xl leading-none text-muted" onClick={() => setPanel(null)} aria-label="Close list">
                  ×
                </button>
              </div>
              <div className="flex gap-2 px-4 py-3">
                <button type="button" onClick={() => setSavedOnly(false)} className={`rounded-full px-3 py-1 text-xs font-semibold ${savedOnly ? "bg-zinc-100" : "bg-ink text-white"}`}>
                  Nearby
                </button>
                <button type="button" onClick={() => setSavedOnly(true)} className={`rounded-full px-3 py-1 text-xs font-semibold ${savedOnly ? "bg-ink text-white" : "bg-zinc-100"}`}>
                  Saved
                </button>
              </div>
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-4">
                {error ? (
                  <div className="rounded-2xl border border-line p-4">
                    <p className="text-sm">{error}</p>
                    <button type="button" className="mt-3 rounded-full bg-ink px-4 py-2 text-sm text-white" onClick={() => setReloadKey((value) => value + 1)}>
                      Try again
                    </button>
                  </div>
                ) : null}
                {!error && !loading && visibleItems.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-line p-4 text-sm text-muted">
                    {savedOnly
                      ? "No saved jobs in this view."
                      : searching
                        ? "Looking around this part of Berlin. Pins show up as places are found."
                        : "Nothing in this radius matches those filters."}
                  </p>
                ) : null}
                {visibleItems.map((item) => (
                    <OpportunityCard
                      key={item.id}
                      item={item}
                      selected={selectedId === item.id}
                      onSelect={() => {
                        setSelectedId(item.id);
                        setDetailsId(null);
                      }}
                      onOpen={() => openDetails(item.id, item.kind)}
                    />
                  ))}
              </div>
            </div>
          )}
        </aside>
      ) : null}

      {panelTarget && panel !== "report" ? (
        <PlacePanel
          id={panelTarget.id}
          kind={panelTarget.kind}
          item={panelTarget.item}
          expanded={detailsId === panelTarget.id}
          origin={{ latitude, longitude }}
          onClose={() => {
            setSelectedId(null);
            setDetailsId(null);
          }}
          onExpand={() => setDetailsId(panelTarget.id)}
          onCollapse={() => setDetailsId(null)}
        />
      ) : null}

      {error && panel !== "list" ? (
        <div className="absolute top-4 left-1/2 z-[700] flex -translate-x-1/2 items-center gap-3 rounded-full bg-white px-4 py-2 text-sm shadow-lg">
          <span>{error}</span>
          <button type="button" className="font-semibold" onClick={() => setReloadKey((value) => value + 1)}>
            Try again
          </button>
        </div>
      ) : null}

      <nav className="absolute inset-x-2 bottom-2 z-[800] grid grid-cols-5 rounded-full bg-white py-1 text-[11px] font-semibold text-muted shadow-[0_8px_24px_rgba(17,17,17,0.16)] sm:hidden">
        <RailButton label="Map" active={panel === null && !selected} onClick={() => { setPanel(null); setSelectedId(null); }}>
          <CompassIcon />
        </RailButton>
        <RailButton label="List" active={panel === "list"} onClick={() => togglePanel("list")}>
          <ListIcon />
        </RailButton>
        <RailButton label="Filters" active={panel === "filters"} onClick={() => togglePanel("filters")}>
          <FilterIcon />
        </RailButton>
        <RailButton label="Visits" active={panel === "visits"} onClick={() => togglePanel("visits")}>
          <RouteIcon />
        </RailButton>
        <RailButton
          label="Tip"
          active={panel === "report"}
          onClick={() => {
            setSelectedId(null);
            setDetailsId(null);
            setPinnedKind(null);
            togglePanel("report");
          }}
        >
          <FlagIcon />
        </RailButton>
      </nav>
      </div>
      </AppContainer>
      {showGuide ? <HowToDialog onClose={() => dismissGuide()} onPostJob={() => dismissGuide(true)} /> : null}
    </div>
  );
}

function MapSearchPulse() {
  return (
    <div className="pointer-events-none absolute inset-0 z-[650] grid place-items-center">
      <div className="map-radar" aria-hidden>
        <span className="map-radar-ping" />
        <div className="map-radar-scope">
          <span className="map-radar-rotor">
            <span className="map-radar-wedge" />
            <span className="map-radar-beam" />
          </span>
        </div>
      </div>
    </div>
  );
}

function RailButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  const color = active ? "text-ink" : "text-muted";
  const bubble = active ? "bg-ink text-white" : "";
  return (
    <button type="button" onClick={onClick} className={`grid min-h-11 w-full place-items-center gap-0.5 px-1 py-1.5 ${color}`}>
      <span className={`grid h-8 w-8 place-items-center rounded-full ${bubble}`}>{children}</span>
      {label}
    </button>
  );
}

function BriefcaseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="2" y="5.2" width="12" height="8" rx="1.6" stroke="currentColor" strokeWidth="1.4" />
      <path d="M6 5.2V4.1A1.1 1.1 0 0 1 7.1 3h1.8A1.1 1.1 0 0 1 10 4.1v1.1" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function FlagIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M4 2.6v11M4 3.2h7.4L9.4 6.1l2 2.9H4" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

type SearchPlace = { label: string; latitude: number; longitude: number };

const RECENT_PLACES_KEY = "jobrador:recent-places";

function readRecentPlaces(): SearchPlace[] {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(RECENT_PLACES_KEY) ?? "[]");
    if (!Array.isArray(value)) return [];
    return value
      .filter(
        (place): place is SearchPlace =>
          typeof place?.label === "string" && Number.isFinite(place?.latitude) && Number.isFinite(place?.longitude),
      )
      .slice(0, 5);
  } catch {
    return [];
  }
}

function rememberPlace(place: SearchPlace) {
  const next = [place, ...readRecentPlaces().filter((saved) => saved.label !== place.label)].slice(0, 5);
  try {
    window.localStorage.setItem(RECENT_PLACES_KEY, JSON.stringify(next));
  } catch {}
  return next;
}

function clearRecentPlaces() {
  try {
    window.localStorage.removeItem(RECENT_PLACES_KEY);
  } catch {}
  return [];
}

function PlaceRow({
  place,
  icon,
  onChoose,
}: {
  place: SearchPlace;
  icon: React.ReactNode;
  onChoose: (place: SearchPlace) => void;
}) {
  const [name, ...rest] = place.label.split(", ");
  return (
    <li>
      <button
        type="button"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          (document.activeElement as HTMLElement | null)?.blur();
          onChoose(place);
        }}
        className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-zinc-50"
      >
        <span className="shrink-0 text-muted">{icon}</span>
        <span className="min-w-0">
          <span className="block truncate text-sm text-ink">{name}</span>
          {rest.length > 0 ? <span className="block truncate text-xs text-muted">{rest.join(", ")}</span> : null}
        </span>
      </button>
    </li>
  );
}

function ClockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

function CategoryIcon({ name }: { name: string }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (name === "restaurant") {
    return (
      <svg {...common}>
        <path d="M7 3v7M5 3v5M9 3v5M7 10v11M17 3v18M17 8h2.5a2 2 0 0 0 0-4H17" />
      </svg>
    );
  }
  if (name === "cafe") {
    return (
      <svg {...common}>
        <path d="M5 8h11v5a5 5 0 0 1-10 0V8ZM16 9h2.2a2.4 2.4 0 0 1 0 4.8H16M7 21h8" />
      </svg>
    );
  }
  if (name === "retail") {
    return (
      <svg {...common}>
        <path d="M6 8h12l-1 12H7L6 8ZM9 8V6.5a3 3 0 0 1 6 0V8" />
      </svg>
    );
  }
  if (name === "warehouse") {
    return (
      <svg {...common}>
        <path d="M3 10 12 4l9 6v10H3V10ZM9 20v-6h6v6" />
      </svg>
    );
  }
  if (name === "logistics") {
    return (
      <svg {...common}>
        <path d="M3 7h11v9H3V7ZM14 11h4l3 3v2h-7v-5Z" />
        <circle cx="7" cy="18" r="1.4" />
        <circle cx="17" cy="18" r="1.4" />
      </svg>
    );
  }
  if (name === "hotel") {
    return (
      <svg {...common}>
        <path d="M4 18V9M4 14h16M20 18v-5a2 2 0 0 0-2-2H9" />
        <circle cx="7" cy="12" r="1.5" />
      </svg>
    );
  }
  if (name === "cleaning") {
    return (
      <svg {...common}>
        <path d="M12 3v3M12 18v3M3 12h3M18 12h3M6 6l2 2M16 16l2 2M18 6l-2 2M8 16l-2 2" />
      </svg>
    );
  }
  if (name === "delivery") {
    return (
      <svg {...common}>
        <path d="M3 8 12 4l9 4-9 4-9-4ZM3 8v8l9 4 9-4V8M12 12v8" />
      </svg>
    );
  }
  if (name === "office") {
    return (
      <svg {...common}>
        <path d="M5 21V4h9v17M14 9h5v12M8 8h2M8 12h2M8 16h2" />
      </svg>
    );
  }
  if (name === "customer_service") {
    return (
      <svg {...common}>
        <path d="M4 13a8 8 0 0 1 16 0M4 13v5h3v-5M17 13v5h3v-5M10 20h4" />
      </svg>
    );
  }
  if (name === "event") {
    return (
      <svg {...common}>
        <path d="M5 6h14v14H5V6ZM5 10h14M8 4v4M16 4v4" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="6" cy="12" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="18" cy="12" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}

function LocateIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="12" r="6.5" />
      <circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className="shrink-0 text-muted">
      <circle cx="7" cy="7" r="4.2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10.4 10.4 13 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function CompassIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <circle cx="9" cy="9" r="6.2" stroke="currentColor" strokeWidth="1.4" />
      <path d="m9 4.5 1.6 3.9L9 13.5 7.4 8.4 9 4.5Z" fill="currentColor" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M4 5h10M4 9h10M4 13h7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M3.5 4.5h11l-4 5.2V14l-3-1.4V9.7l-4-5.2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M9 2.2a4.6 4.6 0 0 0-4.6 4.6c0 3.4 4.6 8.9 4.6 8.9s4.6-5.5 4.6-8.9A4.6 4.6 0 0 0 9 2.2Z" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="9" cy="6.8" r="1.3" fill="currentColor" />
    </svg>
  );
}

function RouteIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M4 4h6.5a2.2 2.2 0 0 1 0 4.4H7.2a2.2 2.2 0 0 0 0 4.4H14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
