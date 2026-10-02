"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { MapCanvas, type MapMarker } from "@/components/map-canvas";
import { OpportunityCard } from "@/components/opportunity-card";
import { SampleBanner } from "@/components/sample-banner";
import { ApiError, getOpportunities } from "@/lib/api/client";
import type { Kind, OpportunityList } from "@/lib/api/types";
import {
  CATEGORY_OPTIONS,
  JOB_TYPE_OPTIONS,
  LANGUAGE_OPTIONS,
  SALARY_OPTIONS,
} from "@/lib/labels";
import { BERLIN_PLACES, DEFAULT_PLACE } from "@/lib/places";

const KINDS: Array<{ id: Kind; label: string }> = [
  { id: "job", label: "Jobs" },
  { id: "community_lead", label: "Leads" },
  { id: "nearby_business", label: "Businesses" },
];

const RADII = ["1", "2", "5", "10"];

function param(value: string | null, fallback = "") {
  return value ?? fallback;
}

export function ExploreScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [draftQuery, setDraftQuery] = useState(param(searchParams.get("q")));
  const [data, setData] = useState<OpportunityList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

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
  const [seenQuery, setSeenQuery] = useState(q);
  const [requestKey, setRequestKey] = useState(filtersKey);
  const [loading, setLoading] = useState(true);

  if (q !== seenQuery) {
    setSeenQuery(q);
    setDraftQuery(q);
  }

  if (requestKey !== filtersKey) {
    setRequestKey(filtersKey);
    setLoading(true);
    setError(null);
  }

  useEffect(() => {
    const handle = window.setTimeout(() => {
      if (draftQuery === q) return;
      update({ q: draftQuery || null });
    }, 300);
    return () => window.clearTimeout(handle);
    // update closes over the latest search params via the function below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftQuery, q]);

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

  useEffect(() => {
    const controller = new AbortController();
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
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted) return;
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        setLoading(false);
        setError(caught instanceof ApiError ? caught.message : "Could not load the map.");
      });
    return () => controller.abort();
  }, [filtersKey, reloadKey, latitude, longitude, radiusKm, q, jobType, category, kinds, language, salary, sort]);

  const activeKinds = useMemo(() => {
    if (!kinds) return KINDS.map((kind) => kind.id);
    return kinds.split(",").filter(Boolean) as Kind[];
  }, [kinds]);

  const markers: MapMarker[] = useMemo(
    () =>
      (data?.items ?? []).map((item) => {
        const params = new URLSearchParams({
          lat: String(latitude),
          lng: String(longitude),
        });
        const path =
          item.kind === "job" ? "jobs" : item.kind === "community_lead" ? "leads" : "businesses";
        return {
          id: item.id,
          kind: item.kind,
          latitude: item.latitude,
          longitude: item.longitude,
          title: item.businessName,
          subtitle: item.kind === "nearby_business" ? "No public vacancy" : item.title,
          href: `/${path}/${item.id}?${params}`,
        };
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
        setNotice(null);
        update({
          lat: String(position.coords.latitude),
          lng: String(position.coords.longitude),
          label: "Your location",
        });
      },
      () => setNotice("Location was blocked. Pick a Berlin area instead."),
    );
  }

  const filtersActive = Boolean(q || jobType || category || language || salary || kinds);

  return (
    <div className="flex h-[calc(100dvh-4rem)] min-h-0 flex-col-reverse md:flex-row">
      <aside className="flex h-[46%] min-h-0 flex-col overflow-y-auto border-t border-line bg-paper md:h-auto md:w-[400px] md:shrink-0 md:border-r md:border-t-0">
      <div className="space-y-3 border-b border-line px-4 py-3">
        <div className="flex flex-col gap-2 md:flex-row">
          <label className="min-w-0 flex-1">
            <span className="sr-only">Search jobs</span>
            <input
              value={draftQuery}
              onChange={(event) => setDraftQuery(event.target.value)}
              placeholder="Search title, place, or area"
              className="field"
            />
          </label>
          <button
            type="button"
            onClick={useMyLocation}
            className="rounded-2xl border border-line bg-card px-4 py-2 text-sm font-medium"
          >
            Use my location
          </button>
        </div>
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
                })
              }
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${label === place.label ? "bg-ink text-white" : "bg-card text-ink"}`}
            >
              {place.label.split(",")[0]}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {RADII.map((radius) => (
            <button
              key={radius}
              type="button"
              onClick={() => update({ radiusKm: radius })}
              className={`rounded-full px-3 py-1.5 text-sm ${String(radiusKm) === radius ? "bg-brand text-white" : "bg-card text-ink"}`}
            >
              {radius} km
            </button>
          ))}
          {KINDS.map((kind) => (
            <button
              key={kind.id}
              type="button"
              aria-pressed={activeKinds.includes(kind.id)}
              onClick={() => toggleKind(kind.id)}
              className={`rounded-full px-3 py-1.5 text-sm ${activeKinds.includes(kind.id) ? "bg-ink text-white" : "bg-card text-muted"}`}
            >
              {kind.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
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
      </div>
      <div className="space-y-3 px-4 py-3">
        <div className="mb-3 space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <h1 className="font-serif text-2xl text-ink">{label}</h1>
            <p className="text-sm text-muted">{loading ? "Updating…" : `${data?.total ?? 0} places`}</p>
          </div>
          <SampleBanner dataSource={data?.dataSource} />
          {notice ? <p className="text-sm text-place">{notice}</p> : null}
          {filtersActive ? (
            <button type="button" className="text-sm font-medium text-brand" onClick={() => update({ q: null, jobType: null, category: null, language: null, salary: null, kinds: null })}>
              Clear filters
            </button>
          ) : null}
        </div>
        {error ? (
          <div className="rounded-2xl border border-line bg-card p-4">
            <p className="text-sm text-ink">{error}</p>
            <button type="button" className="mt-3 rounded-full bg-ink px-4 py-2 text-sm text-white" onClick={() => setReloadKey((value) => value + 1)}>
              Try again
            </button>
          </div>
        ) : null}
        {!error && data && data.items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-card p-4 text-sm text-muted">
            <p>Nothing in this radius matches those filters.</p>
            <button type="button" className="mt-3 font-semibold text-brand" onClick={() => update({ radiusKm: "10" })}>
              Try 10 km
            </button>
          </div>
        ) : null}
        <div className="space-y-3">
          {data?.items.map((item) => {
            const marker = markers.find((entry) => entry.id === item.id);
            return (
              <OpportunityCard
                key={item.id}
                item={item}
                href={marker?.href ?? "/map"}
                selected={selectedId === item.id}
                onSelect={() => setSelectedId(item.id)}
              />
            );
          })}
        </div>
      </div>
      </aside>
      <section className="relative min-h-0 flex-1">
        <MapCanvas
          center={{ latitude, longitude }}
          radiusKm={Number.isFinite(radiusKm) ? radiusKm : 5}
          markers={markers}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
        <ul className="pointer-events-none absolute top-3 right-3 hidden rounded-2xl bg-card/95 px-3 py-2 text-xs text-ink shadow md:block">
          <li className="flex items-center gap-2"><span className="pin pin-job" /> Job listing</li>
          <li className="mt-1 flex items-center gap-2"><span className="pin pin-lead" /> Community lead</li>
          <li className="mt-1 flex items-center gap-2"><span className="pin pin-place" /> Nearby business</li>
        </ul>
      </section>
    </div>
  );
}
