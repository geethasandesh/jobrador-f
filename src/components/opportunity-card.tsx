import type { Opportunity } from "@/lib/api/types";
import { formatDistance, formatWhen } from "@/lib/format";
import { categoryLabel, jobTypeLabel, PLACE_CHECKED_EMPTY, PLACE_CHECKING } from "@/lib/labels";
import { KindBadge } from "./kind-badge";

export function OpportunityCard({
  item,
  selected,
  onSelect,
  onOpen,
}: {
  item: Opportunity;
  selected: boolean;
  onSelect: () => void;
  onOpen: () => void;
}) {
  const when = formatWhen(item.recency);
  const hiring = item.kind === "nearby_business" && Boolean(item.hiring);
  const unchecked = item.status === "UNCHECKED";
  const secondLine = hiring
    ? (item.linkedJobTitle ?? "Hiring")
    : unchecked
      ? PLACE_CHECKING
      : item.kind === "nearby_business"
        ? PLACE_CHECKED_EMPTY
        : item.title;

  return (
    <article
      id={`card-${item.id}`}
      onMouseEnter={onSelect}
      onClick={onSelect}
      className={`rounded-2xl border bg-white p-3 shadow-sm ${selected ? "border-ink" : "border-line"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <KindBadge kind={item.kind} hiring={hiring} />
        <span className="text-sm text-muted">{formatDistance(item.distanceKm)} away</span>
      </div>
      <h3 className="mt-2 text-base font-semibold text-ink">{item.businessName}</h3>
      <p className="text-sm text-ink/80">{secondLine}</p>
      <p className="mt-1 text-sm text-muted">
        {item.area}
        {item.jobType ? ` · ${jobTypeLabel(item.jobType)}` : ` · ${categoryLabel(item.category)}`}
        {item.salaryLabel ? ` · ${item.salaryLabel}` : ""}
      </p>
      {item.kind === "community_lead" ? (
        <p className="mt-2 text-sm text-lead">
          {item.poster === "business"
            ? `Posted by the business${when ? ` · ${when}` : ""}`
            : `${item.confirmYes ?? 0} confirmed${
                (item.confirmNo ?? 0) > 0
                  ? ` · ${item.confirmNo} ${item.confirmNo === 1 ? "says" : "say"} outdated`
                  : ""
              }${when ? ` · shared ${when}` : ""}`}
        </p>
      ) : null}
      {item.kind === "job" && when ? (
        <p className="mt-2 text-sm text-muted">Posted {when}</p>
      ) : null}
      {item.languageLabel ? <p className="mt-1 text-sm text-muted">{item.languageLabel}</p> : null}
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onOpen();
        }}
        className="mt-3 inline-flex text-sm font-semibold text-brand"
      >
        View details
      </button>
    </article>
  );
}
