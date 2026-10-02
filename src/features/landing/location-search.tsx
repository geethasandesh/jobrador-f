"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { mapHref } from "@/lib/format";
import { BERLIN_PLACES, DEFAULT_PLACE } from "@/lib/places";

export function LocationSearch() {
  const router = useRouter();
  const [placeId, setPlaceId] = useState(DEFAULT_PLACE.id);
  const [message, setMessage] = useState<string | null>(null);

  function explore(latitude: number, longitude: number, label: string) {
    router.push(mapHref(latitude, longitude, label));
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
    <div className="mt-8 max-w-xl space-y-3">
      <label className="block text-sm font-medium text-ink" htmlFor="area">
        City, area, or university neighbourhood
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <select
          id="area"
          className="field"
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
          className="rounded-2xl bg-brand px-5 py-3 text-sm font-semibold text-white"
        >
          Explore jobs
        </button>
      </div>
      <button type="button" onClick={useMyLocation} className="text-sm font-semibold text-brand">
        Use my location
      </button>
      {message ? <p className="text-sm text-muted">{message}</p> : null}
    </div>
  );
}
