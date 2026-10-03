"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
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
import { ApiError, getOpportunities, searchPlaces } from "@/lib/api/client";
import type { Kind, OpportunityList } from "@/lib/api/types";
import { markersFromOpportunities } from "@/lib/map-markers";
import {
  CATEGORY_OPTIONS,
  JOB_TYPE_OPTIONS,
  KIND_LABEL,
  LANGUAGE_OPTIONS,
  SALARY_OPTIONS,
} from "@/lib/labels";
import { removeRouteStop, useClientReady, useRoute, useSavedJobs } from "@/lib/local-lists";
import { hasSeenGuide, markGuideSeen } from "@/lib/guide";
import { signOut, useAuthReady, useSession } from "@/lib/session";
import { BERLIN_ONLY_MESSAGE, BERLIN_PLACES, DEFAULT_PLACE } from "@/lib/places";

const KINDS: Array<{ id: Kind; label: string }> = [
  { id: "job", label: "Jobs" },
  { id: "community_lead", label: "Leads" },
  { id: "nearby_business", label: "Businesses" },
];

const RADII = ["1", "2", "5", "10"];

const PLACE_FILTERS = [
  { value: "restaurant", label: "Restaurant" },
  { value: "cafe", label: "Café" },
  { value: "hotel", label: "Hotel" },
  { value: "retail", label: "Retail" },
  { value: "warehouse", label: "Warehouse" },
  { value: "logistics", label: "Logistics" },
  { value: "other", label: "Other" },
];

function param(value: string | null, fallback = "") {
  return value ?? fallback;
}

export function ExploreScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [draftQuery, setDraftQuery] = useState("");
  const [placeHits, setPlaceHits] = useState<Array<{ label: string; latitude: number; longitude: number }>>([]);
  const [searching, setSearching] = useState(true);
  const [data, setData] = useState<OpportunityList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [pinnedKind, setPinnedKind] = useState<Kind | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [panel, setPanel] = useState<"list" | "filters" | "visits" | "report" | "post" | "mine" | null>(null);
  const [savedOnly, setSavedOnly] = useState(false);
  const ready = useClientReady();
  const authReady = useAuthReady();
  const session = useSession();
  const savedIds = useSavedJobs();
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

  function choosePlace(place: { label: string; latitude: number; longitude: number }) {
    setDraftQuery(place.label);
    setPlaceHits([]);
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
    const controller = new AbortController();
    let timer = 0;
    let attempt = 0;
    let lastTotal = -1;
    let stable = 0;

    const load = () => {
      getOpportunities(
        {
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
        },
        controller.signal,
      )
        .then((result) => {
          if (controller.signal.aborted) return;
          setData(result);
          setError(null);
          setLoading(false);
          if (result.total === lastTotal) stable += 1;
          else stable = 0;
          lastTotal = result.total;
          attempt += 1;
          const keepLooking = attempt < 5 && stable < 2;
          setSearching(keepLooking);
          if (keepLooking) timer = window.setTimeout(load, 4000);
        })
        .catch((caught: unknown) => {
          if (controller.signal.aborted) return;
          if (caught instanceof DOMException && caught.name === "AbortError") return;
          setLoading(false);
          setSearching(false);
          setError(caught instanceof ApiError ? caught.message : "Could not load the map.");
        });
    };

    load();
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [filtersKey, reloadKey, latitude, longitude, radiusKm, q, jobType, category, kinds, language, salary, sort]);

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

  function useMyLocation() {
    if (!navigator.geolocation) {
      setNotice("This browser cannot share a location.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
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
        update({
          lat: String(nextLatitude),
          lng: String(nextLongitude),
          label: "Your location",
          q: null,
        });
      },
      () => setNotice("Location was blocked. Pick a Berlin area instead."),
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
    <div className="flex h-dvh flex-col overflow-hidden bg-white px-6 py-3 sm:px-10 md:px-16">
      <div className="mb-3 flex items-center gap-2">
        <div className="hidden shrink-0 sm:block">
          <Logo compact />
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
        </form>
        {placeHits.length > 0 ? (
          <ul className="absolute top-[calc(100%+6px)] right-0 left-0 z-[800] overflow-hidden rounded-2xl border border-line bg-white py-1 shadow-lg">
            {placeHits.map((place) => (
              <li key={`${place.label}-${place.latitude}`}>
                <button
                  type="button"
                  className="w-full px-4 py-2 text-left text-sm hover:bg-zinc-50"
                  onClick={() => choosePlace(place)}
                >
                  {place.label}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSelectedId(null);
              setDetailsId(null);
              setPinnedKind(null);
              setPanel("post");
            }}
            className={`inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-2 text-sm font-medium shadow-sm ${panel === "post" ? "bg-zinc-100 text-ink" : "bg-white text-muted"}`}
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
            className={`inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-2 text-sm font-medium shadow-sm ${panel === "report" ? "bg-zinc-100 text-ink" : "bg-white text-muted"}`}
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
          <button
            type="button"
            onClick={() => {
              setSavedOnly(true);
              setPanel("list");
            }}
            className="rounded-full border border-line bg-white px-3 py-2 text-sm font-medium shadow-sm"
          >
            Saved <span className="text-muted">{savedCount}</span>
          </button>
          <button
            type="button"
            onClick={() => togglePanel("visits")}
            className="rounded-full border border-line bg-white px-3 py-2 text-sm font-medium shadow-sm"
          >
            Visit list <span className="text-muted">{visitCount}</span>
          </button>
          {session ? (
            <button
              type="button"
              onClick={() => {
                void signOut().then(() => router.push("/"));
              }}
              className="rounded-full bg-ink px-3 py-2 text-sm font-medium text-white shadow-sm"
            >
              Log out
            </button>
          ) : null}
        </div>
      </div>

      <AppContainer className="min-h-0 flex-1">
      <div className="relative h-full min-h-0 bg-[#efeae3]">
      <MapCanvas
        center={{ latitude, longitude }}
        radiusKm={Number.isFinite(radiusKm) ? radiusKm : 5}
        markers={markers}
        selectedId={selectedId}
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

      <div className="absolute left-1/2 top-4 z-[700] flex -translate-x-1/2 flex-col items-center gap-2">
        <MapToast message={toast} />
        <SampleBanner dataSource={data?.dataSource} />
        {searching ? (
          <p className="rounded-full bg-white px-3 py-1 text-sm font-medium shadow-sm">Looking in this circle…</p>
        ) : null}
      </div>

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
        <aside className="absolute top-4 bottom-24 left-3 z-[700] flex w-[min(100%-1.5rem,360px)] flex-col overflow-hidden rounded-3xl bg-white shadow-[0_18px_50px_rgba(17,17,17,0.16)] sm:bottom-6 sm:left-24">
          {panel === "post" ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex items-center justify-between px-4 pt-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#ff7a1a]">Your business</p>
                  <h2 className="text-lg font-bold tracking-tight">Post a job</h2>
                </div>
                <button type="button" className="text-xl leading-none text-muted" onClick={() => setPanel(null)} aria-label="Close">
                  ×
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
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
                <button type="button" className="mt-4 text-sm font-semibold" onClick={() => setPanel("mine")}>
                  Your posts
                </button>
              </div>
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
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex items-center justify-between px-4 pt-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#3b82f6]">Student tip</p>
                  <h2 className="text-lg font-bold tracking-tight">Share a tip</h2>
                </div>
                <button type="button" className="text-xl leading-none text-muted" onClick={() => setPanel(null)} aria-label="Close">
                  ×
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
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
            </div>
          ) : panel === "visits" ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex items-center justify-between px-4 pt-4">
                <h2 className="text-lg font-bold tracking-tight">Visit list</h2>
                <button type="button" className="text-xl leading-none text-muted" onClick={() => setPanel(null)} aria-label="Close visit list">
                  ×
                </button>
              </div>
              <p className="px-4 pt-1 text-sm text-muted">Stops stay on this device, in the order you added them.</p>
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
                {stops.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-line p-4 text-sm text-muted">No stops yet. Add them from a place card.</p>
                ) : (
                  stops.map((stop, index) => (
                    <article key={stop.id} className="rounded-2xl border border-line p-3">
                      <p className="text-xs font-semibold text-muted">Stop {index + 1}</p>
                      <h3 className="mt-1 font-semibold">{stop.title}</h3>
                      <p className="text-sm text-muted">{KIND_LABEL[stop.kind]} · {stop.subtitle}</p>
                      <div className="mt-2 flex gap-3 text-sm">
                        <button
                          type="button"
                          className="font-semibold"
                          onClick={() => openDetails(stop.id, stop.kind)}
                        >
                          View
                        </button>
                        <button type="button" className="text-muted" onClick={() => removeRouteStop(stop.id)}>
                          Remove
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>
          ) : panel === "filters" ? (
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold tracking-tight">Filters</h2>
                <button type="button" className="text-xl leading-none text-muted" onClick={() => setPanel(null)} aria-label="Close filters">
                  ×
                </button>
              </div>
              <p className="text-sm text-muted">{label}</p>
              <div className="flex gap-2 overflow-x-auto">
                {BERLIN_PLACES.map((place) => (
                  <button
                    key={place.id}
                    type="button"
                    onClick={() =>
                      update({
                        lat: String(place.latitude),
                        lng: String(place.longitude),
                        label: place.label,
                        q: null,
                      })
                    }
                    className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${label === place.label ? "bg-ink text-white" : "bg-zinc-100 text-ink"}`}
                  >
                    {place.label.split(",")[0]}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {RADII.map((radius) => (
                  <button
                    key={radius}
                    type="button"
                    onClick={() => update({ radiusKm: radius })}
                    className={`rounded-full px-3 py-1.5 text-sm ${String(radiusKm) === radius ? "bg-ink text-white" : "bg-zinc-100"}`}
                  >
                    {radius} km
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {PLACE_FILTERS.map((place) => (
                  <button
                    key={place.value}
                    type="button"
                    aria-pressed={category === place.value}
                    onClick={() => update({ category: category === place.value ? null : place.value })}
                    className={`rounded-full px-3 py-1.5 text-sm ${category === place.value ? "bg-ink text-white" : "bg-zinc-100"}`}
                  >
                    {place.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {KINDS.map((kind) => (
                  <button
                    key={kind.id}
                    type="button"
                    aria-pressed={activeKinds.includes(kind.id)}
                    onClick={() => toggleKind(kind.id)}
                    className={`rounded-full px-3 py-1.5 text-sm ${activeKinds.includes(kind.id) ? "bg-ink text-white" : "bg-zinc-100 text-muted"}`}
                  >
                    {kind.label}
                  </button>
                ))}
              </div>
              <div className="grid gap-2">
                <select className="field" aria-label="Job type" value={jobType} onChange={(event) => update({ jobType: event.target.value || null })}>
                  <option value="">Any job type</option>
                  {JOB_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <select className="field" aria-label="Category" value={category} onChange={(event) => update({ category: event.target.value || null })}>
                  <option value="">Any category</option>
                  {CATEGORY_OPTIONS.map((option) => (
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
                <select className="field" aria-label="Sort" value={sort} onChange={(event) => update({ sort: event.target.value })}>
                  <option value="distance">Nearest</option>
                  <option value="newest">Newest</option>
                </select>
              </div>
              <button type="button" onClick={useMyLocation} className="text-sm font-semibold">
                Use my location
              </button>
              {notice ? <p className="text-sm text-place">{notice}</p> : null}
              {filtersActive ? (
                <button type="button" className="text-sm font-semibold" onClick={() => update({ q: null, jobType: null, category: null, language: null, salary: null, kinds: null })}>
                  Clear filters
                </button>
              ) : null}
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex items-center justify-between gap-3 px-4 pt-4">
                <div>
                  <h2 className="text-lg font-bold tracking-tight">{label.split(",")[0]}</h2>
                  <p className="text-sm text-muted">{loading || searching ? "Looking in this circle…" : `${visibleItems.length} places`}</p>
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

      <nav className="absolute inset-x-3 bottom-3 z-[700] grid grid-cols-5 rounded-2xl bg-white py-2 text-[11px] font-medium text-muted shadow-[0_10px_30px_rgba(17,17,17,0.12)] sm:hidden">
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
  const color = active ? "text-ink" : "hover:text-ink";
  const bubble = active ? "bg-zinc-100" : "";
  return (
    <button type="button" onClick={onClick} className={`grid w-full place-items-center gap-0.5 px-1 py-2 ${color}`}>
      <span className={`grid h-8 w-8 place-items-center rounded-xl ${bubble}`}>{children}</span>
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
