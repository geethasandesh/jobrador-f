"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Logo } from "@/components/logo";
import { MapCanvas, type MapMarker } from "@/components/map-canvas";
import { SampleBanner } from "@/components/sample-banner";
import { ApiError, getOpportunities } from "@/lib/api/client";
import type { Kind, Opportunity } from "@/lib/api/types";
import { formatDistance, mapHref } from "@/lib/format";
import { markersFromOpportunities } from "@/lib/map-markers";
import { categoryLabel, jobTypeLabel, KIND_LABEL } from "@/lib/labels";
import { useClientReady, useRoute, useSavedJobs } from "@/lib/local-lists";
import { DEFAULT_PLACE } from "@/lib/places";
import { useAuthReady, useSession } from "@/lib/session";

const statusBar: Record<Kind, { label: string; className: string }> = {
  job: { label: "JOB LISTING", className: "bg-[#22c55e]" },
  community_lead: { label: "STUDENT REPORT", className: "bg-[#3b82f6]" },
  nearby_business: { label: "NO PUBLIC VACANCY", className: "bg-[#f59e0b]" },
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
  const [items, setItems] = useState<Opportunity[]>([]);
  const [dataSource, setDataSource] = useState<"mock" | "live" | undefined>("mock");
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
        if (caught instanceof ApiError) setDataSource("mock");
      });
    return () => controller.abort();
  }, []);

  const markers: MapMarker[] = useMemo(
    () => markersFromOpportunities(items, () => "/map"),
    [items],
  );

  const selected = items.find((item) => item.id === selectedId) ?? null;

  function openMap(path = mapHref(DEFAULT_PLACE.latitude, DEFAULT_PLACE.longitude, DEFAULT_PLACE.label)) {
    if (authReady && session) {
      router.push(path);
      return;
    }
    router.push(`/login?next=${encodeURIComponent(path)}`);
  }

  function search(event: FormEvent) {
    event.preventDefault();
    const href = mapHref(DEFAULT_PLACE.latitude, DEFAULT_PLACE.longitude, DEFAULT_PLACE.label);
    openMap(query.trim() ? `${href}&q=${encodeURIComponent(query.trim())}` : href);
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 bg-white p-3 sm:p-4">
      <div className="flex shrink-0 items-center gap-2">
        <div className="hidden shrink-0 sm:block">
          <Logo compact />
        </div>
        <form onSubmit={search} className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-line bg-white py-1 pl-3 pr-1 shadow-[0_8px_30px_rgba(17,17,17,0.08)]">
          <span className="sr-only">Search jobs</span>
          <SearchIcon />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search jobs, places, or areas"
            className="min-w-0 flex-1 bg-transparent py-1.5 text-sm outline-none"
          />
        </form>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={() => openMap("/map?panel=saved")} className="rounded-full border border-line bg-white px-3 py-2 text-sm font-medium shadow-sm">
            Saved <span className="text-muted">{savedCount}</span>
          </button>
          <button type="button" onClick={() => openMap("/map?panel=visits")} className="rounded-full border border-line bg-white px-3 py-2 text-sm font-medium shadow-sm">
            Visit list <span className="text-muted">{visitCount}</span>
          </button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden rounded-[22px] bg-[#efeae3]">
            <MapCanvas
              center={{ latitude: DEFAULT_PLACE.latitude, longitude: DEFAULT_PLACE.longitude }}
              radiusKm={5}
              markers={markers}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
            <div className="absolute left-1/2 top-4 z-[700] -translate-x-1/2">
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
    <article className="absolute top-4 right-3 z-[700] w-[min(100%-1.5rem,320px)] overflow-hidden rounded-2xl bg-white shadow-[0_18px_50px_rgba(17,17,17,0.18)] sm:right-4">
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
              : "No public vacancy found"
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
