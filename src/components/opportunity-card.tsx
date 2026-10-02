import Link from "next/link";
import type { Opportunity } from "@/lib/api/types";
import { formatDistance, formatWhen } from "@/lib/format";
import { categoryLabel, jobTypeLabel } from "@/lib/labels";
import { KindBadge } from "./kind-badge";

export function OpportunityCard({
  item,
  href,
  selected,
  onSelect,
}: {
  item: Opportunity;
  href: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const when = formatWhen(item.recency);
  const secondLine = item.kind === "nearby_business" ? "No public vacancy" : item.title;

  return (
    <article
      id={`card-${item.id}`}
      onMouseEnter={onSelect}
      onClick={onSelect}
      className={`rounded-2xl border bg-card p-3 ${selected ? "border-brand ring-4 ring-brand/15" : "border-line"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <KindBadge kind={item.kind} />
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
          {item.confirmYes ?? 0} confirmed
          {(item.confirmNo ?? 0) > 0
            ? ` · ${item.confirmNo} ${item.confirmNo === 1 ? "says" : "say"} outdated`
            : ""}
          {when ? ` · reported ${when}` : ""}
        </p>
      ) : null}
      {item.kind === "job" && when ? (
        <p className="mt-2 text-sm text-muted">Posted {when}</p>
      ) : null}
      {item.languageLabel ? <p className="mt-1 text-sm text-muted">{item.languageLabel}</p> : null}
      <Link href={href} className="mt-3 inline-flex text-sm font-semibold text-brand">
        View
      </Link>
    </article>
  );
}
