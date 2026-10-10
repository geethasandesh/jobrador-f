import type { MapMarker } from "@/components/map-canvas";
import type { Opportunity } from "@/lib/api/types";
import { compactDistance } from "@/lib/format";
import { PLACE_CHECKED_EMPTY, PLACE_CHECKING } from "@/lib/labels";

export function markersFromOpportunities(
  items: Opportunity[],
  hrefFor: (item: Opportunity) => string,
): MapMarker[] {
  const coveredJobs = new Set(
    items
      .filter((item) => item.kind === "nearby_business" && item.hiring)
      .flatMap((item) => item.linkedJobIds ?? []),
  );
  return items
    .filter((item) => !(item.kind === "job" && coveredJobs.has(item.id)))
    .map((item) => {
      const hiring = item.kind === "nearby_business" && Boolean(item.hiring);
      return {
        id: item.id,
        kind: hiring ? "job" : item.kind,
        tone: item.status === "UNCHECKED" ? "unknown" : undefined,
        latitude: item.latitude,
        longitude: item.longitude,
        title: hiring ? `${item.businessName} · Hiring` : item.businessName,
        subtitle: hiring
          ? (item.linkedJobTitle ?? "Hiring")
          : item.status === "UNCHECKED"
            ? PLACE_CHECKING
            : item.kind === "nearby_business"
              ? PLACE_CHECKED_EMPTY
              : item.title,
        label: compactDistance(item.distanceKm),
        href: hrefFor(item),
      };
    });
}
