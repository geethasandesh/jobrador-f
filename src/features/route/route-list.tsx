"use client";

import Link from "next/link";
import { removeRouteStop, useRoute } from "@/lib/local-lists";
import { KIND_LABEL } from "@/lib/labels";

export function RouteList() {
  const stops = useRoute();

  if (stops.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <h1 className="font-serif text-4xl">Your route</h1>
        <p className="mt-3 text-muted">
          Add jobs, leads, or nearby businesses from their pages. This list stays on this device, in the order you added them. Walking order comes later.
        </p>
        <Link href="/map" className="mt-6 inline-flex rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white">
          Explore the map
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="font-serif text-4xl">Your route</h1>
      <p className="mt-3 text-muted">
        {stops.length} stops, in the order you added them. This is a visit list, not an optimized path yet.
      </p>
      <ol className="mt-6 space-y-3">
        {stops.map((stop, index) => (
          <li key={stop.id} className="rounded-2xl border border-line bg-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Stop {index + 1}</p>
            <h2 className="mt-1 font-semibold">{stop.title}</h2>
            <p className="text-sm text-muted">{KIND_LABEL[stop.kind]} · {stop.subtitle}</p>
            <div className="mt-3 flex gap-3 text-sm">
              <Link href={stop.href} className="font-semibold text-brand">View</Link>
              <button
                type="button"
                className="text-muted"
                onClick={() => removeRouteStop(stop.id)}
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
