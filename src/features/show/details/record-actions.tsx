"use client";

import { useState } from "react";
import { addRouteStop, toggleSavedJob, useJobSaved, useRoute, type RouteStop } from "@/lib/local-lists";

export function RecordActions({
  stop,
  canSave,
  compact = false,
}: {
  stop: RouteStop;
  canSave: boolean;
  compact?: boolean;
}) {
  const saved = useJobSaved(stop.id);
  const onRoute = useRoute().some((item) => item.id === stop.id);
  const [copied, setCopied] = useState(false);
  const canShare = stop.latitude != null && stop.longitude != null;

  async function shareDoor() {
    if (stop.latitude == null || stop.longitude == null) return;
    const params = new URLSearchParams({
      lat: stop.latitude.toFixed(5),
      lng: stop.longitude.toFixed(5),
      radiusKm: "1",
      label: stop.title,
      pin: stop.id,
    });
    const url = `${window.location.origin}/map?${params.toString()}`;
    const text = `${stop.title}. ${stop.subtitle}`;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: stop.title, text, url });
        return;
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className={`${compact ? "mt-4" : "mt-6"} flex flex-wrap gap-2`}>
      {canSave ? (
        <button
          type="button"
          onClick={() => toggleSavedJob(stop.id, stop.kind)}
          className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white"
        >
          {saved ? "Saved" : stop.kind === "nearby_business" ? "Save place" : "Save"}
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => addRouteStop(stop)}
        className="rounded-full border border-line bg-card px-4 py-2 text-sm font-semibold"
      >
        {onRoute ? "On your route" : "Add to route"}
      </button>
      {canShare ? (
        <button type="button" onClick={() => void shareDoor()} className="rounded-full border border-line bg-card px-4 py-2 text-sm font-semibold">
          {copied ? "Link copied" : "Share"}
        </button>
      ) : null}
    </div>
  );
}
