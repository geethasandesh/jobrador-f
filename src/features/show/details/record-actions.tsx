"use client";

import { addRouteStop, toggleSavedJob, useJobSaved, useRoute, type RouteStop } from "@/lib/local-lists";

export function RecordActions({
  stop,
  canSave,
}: {
  stop: RouteStop;
  canSave: boolean;
}) {
  const saved = useJobSaved(stop.id);
  const onRoute = useRoute().some((item) => item.id === stop.id);

  return (
    <div className="mt-6 flex flex-wrap gap-2">
      {canSave ? (
        <button
          type="button"
          onClick={() => toggleSavedJob(stop.id)}
          className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white"
        >
          {saved ? "Saved on this device" : "Save job"}
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => addRouteStop(stop)}
        className="rounded-full border border-line bg-card px-4 py-2 text-sm font-semibold"
      >
        {onRoute ? "On your route" : "Add to route"}
      </button>
    </div>
  );
}
