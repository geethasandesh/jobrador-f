"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Logo } from "@/components/logo";
import { MapCanvas, type MapMarker } from "@/components/map-canvas";
import { MapToast } from "@/components/map-toast";
import { SampleBanner } from "@/components/sample-banner";
import { ApiError, getOpportunities, searchPlaces } from "@/lib/api/client";
import type { Kind, Opportunity } from "@/lib/api/types";
import { formatDistance, mapHref } from "@/lib/format";
import { markersFromOpportunities } from "@/lib/map-markers";
import { categoryLabel, jobTypeLabel, KIND_LABEL, PLACE_CHECKED_EMPTY, PLACE_CHECKING } from "@/lib/labels";
import { useClientReady, useRoute, useSavedJobs } from "@/lib/local-lists";
import { BERLIN_ONLY_MESSAGE, DEFAULT_PLACE } from "@/lib/places";
import { useAuthReady, useSession } from "@/lib/session";

const statusBar: Record<Kind, { label: string; className: string }> = {
  job: { label: "JOB LISTING", className: "bg-[#22c55e]" },
  community_lead: { label: "STUDENT REPORT", className: "bg-[#3b82f6]" },
  nearby_business: { label: "ASK IN PERSON", className: "bg-[#f59e0b]" },
};

export function LandingMap() {
  const router = useRouter();
  const authReady = useAuthReady();
  const session = useSession();
  const ready = useClientReady();
  const savedIds = useSavedJobs();
  const stops = useRoute();
  const savedCount = ready ? savedIds.length : 0;
  const visitCount = ready ? stops.length : 0;
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [items, setItems] = useState<Opportunity[]>([]);
  const [dataSource, setDataSource] = useState<"mock" | "live" | undefined>(undefined);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loginPath, setLoginPath] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    getOpportunities(
      {
        latitude: DEFAULT_PLACE.latitude,
        longitude: DEFAULT_PLACE.longitude,
        radiusKm: 5,
        sort: "distance",
      },
      controller.signal,
    )
      .then((result) => {
        if (controller.signal.aborted) return;
        setItems(result.items);
        setDataSource(result.dataSource);
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted) return;
        if (caught instanceof ApiError) return;
      });
    return () => controller.abort();
  }, []);

  const markers: MapMarker[] = useMemo(
    () => markersFromOpportunities(items, () => "/map"),
    [items],
  );

  const selected = items.find((item) => item.id === selectedId) ?? null;

  function openMap(path = mapHref(DEFAULT_PLACE.latitude, DEFAULT_PLACE.longitude, DEFAULT_PLACE.label)) {
    if (!authReady) return;
    if (session) {
      router.push(path);
      return;
    }
    setLoginPath(path);
  }

  const signedIn = Boolean(authReady && session);

  function openPin(id: string) {
    const item = items.find((entry) => entry.id === id);
    if (!item) {
      openMap();
      return;
    }
    openMap(mapHref(item.latitude, item.longitude, item.area || item.businessName));
  }

  function search(event: FormEvent) {
    event.preventDefault();
    if (!signedIn) {
      openMap();
      return;
    }
    const typed = query.trim();
    if (typed.length < 2) {
      openMap();
      return;
    }
    setToast("Searching…");
    void searchPlaces(typed)
      .then((result) => {
        if (result.outsideBerlin) {
          setToast(BERLIN_ONLY_MESSAGE);
          return;
        }
        const place = result.places[0];
        if (!place) {
          setToast("No Berlin place matched that name.");
          return;
        }
        setToast(null);
        openMap(mapHref(place.latitude, place.longitude, place.label));
      })
      .catch(() => setToast("Search did not go through. Try that Berlin name again."));
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col gap-2 bg-white p-2 sm:gap-3 sm:p-4">
      <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex min-w-0 items-center gap-2">
          <div className="hidden shrink-0 sm:block">
            <Logo compact />
          </div>
          <form
            onSubmit={search}
            onPointerDown={(event) => {
              if (signedIn) return;
              event.preventDefault();
              openMap();
            }}
            className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-line bg-white py-1 pl-3 pr-1 shadow-[0_8px_30px_rgba(17,17,17,0.08)]"
          >
            <span className="sr-only">Search jobs</span>
            <SearchIcon />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              readOnly={!signedIn}
              placeholder="Search jobs, places, or areas"
              className="min-w-0 flex-1 bg-transparent py-1.5 text-sm outline-none"
            />
          </form>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={() => openMap("/map?panel=saved")} className="rounded-full border border-line bg-white px-3 py-2 text-sm font-medium shadow-sm">
            Saved <span className="text-muted">{savedCount}</span>
          </button>
          <button type="button" onClick={() => openMap("/map?panel=visits")} className="rounded-full border border-line bg-white px-3 py-2 text-sm font-medium shadow-sm">
            Visits <span className="text-muted">{visitCount}</span>
          </button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden rounded-[22px] bg-[#efeae3]">
            <MapCanvas
              center={{ latitude: DEFAULT_PLACE.latitude, longitude: DEFAULT_PLACE.longitude }}
              radiusKm={5}
              markers={markers}
              selectedId={selectedId}
              onSelect={openPin}
            />
            <div className="absolute inset-x-3 top-3 z-[700] flex flex-col items-center gap-2 sm:inset-x-16 sm:top-4">
              <MapToast message={toast} />
              <SampleBanner dataSource={dataSource} />
            </div>
            <nav className="absolute top-4 left-3 z-[700] hidden w-16 flex-col items-center gap-1 rounded-2xl bg-white py-2 text-[10px] font-medium text-muted shadow-[0_10px_30px_rgba(17,17,17,0.1)] sm:flex">
              <RailButton label="Discover" active onClick={() => openMap()}>
                <CompassIcon />
              </RailButton>
              <RailButton label="List" onClick={() => openMap()}>
                <ListIcon />
              </RailButton>
              <RailButton label="Filters" onClick={() => openMap()}>
                <FilterIcon />
              </RailButton>
              <RailButton label="Share" onClick={() => openMap("/map?panel=share")}>
                <PinIcon />
              </RailButton>
            </nav>
            {selected ? <PreviewCard item={selected} onOpen={() => openMap()} onClose={() => setSelectedId(null)} /> : null}
      </div>
      {loginPath ? (
        <div className="absolute inset-0 z-[800] grid place-items-center bg-[#0e1a2b]/45 p-4">
          <div role="dialog" aria-labelledby="map-login-title" className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-[0_24px_60px_rgba(8,20,40,0.28)]">
            <div className="flex justify-end">
              <button type="button" onClick={() => setLoginPath(null)} className="grid h-8 w-8 place-items-center rounded-full text-xl leading-none text-muted" aria-label="Close">
                ×
              </button>
            </div>
            <h2 id="map-login-title" className="text-2xl font-black tracking-tight">Log in to start</h2>
            <p className="mt-2 text-sm leading-6 text-muted">Search, pins, and the map open after you log in.</p>
            <button
              type="button"
              onClick={() => router.push(`/login?next=${encodeURIComponent(loginPath)}`)}
              className="mt-5 w-full rounded-full bg-ink py-3 text-sm font-semibold text-white"
            >
              Login
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PreviewCard({ item, onOpen, onClose }: { item: Opportunity; onOpen: () => void; onClose: () => void }) {
  const status =
    item.kind === "nearby_business" && item.hiring
      ? { label: "HIRING", className: "bg-[#22c55e]" }
      : statusBar[item.kind];
  const initials = item.businessName
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <article className="absolute inset-x-2 bottom-2 z-[700] max-h-[46%] overflow-y-auto rounded-2xl bg-white shadow-[0_18px_50px_rgba(17,17,17,0.18)] sm:inset-x-auto sm:top-4 sm:right-4 sm:bottom-auto sm:max-h-none sm:w-[min(100%-1.5rem,320px)]">
      <div className={`${status.className} py-1.5 text-center text-[11px] font-bold tracking-[0.14em] text-white`}>
        {status.label}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-zinc-100 text-sm font-black">{initials}</span>
          <button type="button" onClick={onClose} className="text-xl leading-none text-muted" aria-label="Close">
            ×
          </button>
        </div>
        <h2 className="mt-3 text-xl font-bold tracking-tight">{item.businessName}</h2>
        <p className="text-sm text-muted">
          {item.kind === "nearby_business"
            ? item.hiring
              ? `Hiring · ${item.linkedJobTitle ?? "Open role"}`
              : item.status === "UNCHECKED"
                ? PLACE_CHECKING
                : PLACE_CHECKED_EMPTY
            : item.title}
        </p>
        <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
          <span>{formatDistance(item.distanceKm)} away</span>
          <span>{item.jobType ? jobTypeLabel(item.jobType) : categoryLabel(item.category)}</span>
        </p>
        <p className="mt-2 text-xs text-muted">{KIND_LABEL[item.kind]} · {item.area}</p>
        <button type="button" onClick={onOpen} className="mt-4 inline-flex rounded-full bg-ink px-3.5 py-1.5 text-sm font-semibold text-white">
          View details
        </button>
      </div>
    </article>
  );
}

function RailButton({
  label,
  active = false,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} className={`grid w-full place-items-center gap-0.5 px-1 py-2 ${active ? "text-ink" : "hover:text-ink"}`}>
      <span className={`grid h-8 w-8 place-items-center rounded-xl ${active ? "bg-zinc-100" : ""}`}>{children}</span>
      {label}
    </button>
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
