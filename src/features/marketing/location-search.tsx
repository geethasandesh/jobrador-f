"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { mapHref } from "@/lib/format";
import { BERLIN_PLACES, DEFAULT_PLACE } from "@/lib/places";
import { useAuthReady, useSession } from "@/lib/session";

export function LocationSearch() {
  const router = useRouter();
  const ready = useAuthReady();
  const session = useSession();
  const [placeId, setPlaceId] = useState(DEFAULT_PLACE.id);
  const [message, setMessage] = useState<string | null>(null);

  function explore(latitude: number, longitude: number, label: string) {
    const href = mapHref(latitude, longitude, label);
    if (ready && session) {
      router.push(href);
      return;
    }
    router.push(`/login?next=${encodeURIComponent(href)}`);
  }

  function exploreSelected() {
    const place = BERLIN_PLACES.find((item) => item.id === placeId) ?? DEFAULT_PLACE;
    explore(place.latitude, place.longitude, place.label);
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setMessage("This browser cannot share a location. Pick a Berlin area instead.");
      return;
    }
    setMessage("Finding your location…");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        explore(position.coords.latitude, position.coords.longitude, "Your location");
      },
      () => setMessage("Location was blocked. Pick a Berlin area instead."),
    );
  }

  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2 rounded-full border border-line bg-white py-1 pl-3 pr-1 shadow-sm">
        <SearchIcon />
        <label className="sr-only" htmlFor="area">
          City, area, or university neighbourhood
        </label>
        <select
          id="area"
          className="min-w-0 flex-1 bg-transparent py-1.5 text-sm text-ink outline-none"
          value={placeId}
          onChange={(event) => setPlaceId(event.target.value)}
        >
          {BERLIN_PLACES.map((place) => (
            <option key={place.id} value={place.id}>
              {place.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={exploreSelected}
          className="rounded-full bg-ink px-3.5 py-1.5 text-sm font-semibold text-white"
        >
          Map
        </button>
      </div>
      <button type="button" onClick={useMyLocation} className="mt-1 px-3 text-xs font-medium text-muted hover:text-ink">
        Use my location
      </button>
      {message ? <p className="px-3 text-xs text-muted">{message}</p> : null}
    </div>
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
