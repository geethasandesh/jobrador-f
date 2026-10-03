import type { Kind } from "@/lib/api/types";
import { KIND_LABEL } from "@/lib/labels";

const style: Record<Kind, string> = {
  job: "bg-job-soft text-job",
  community_lead: "bg-lead-soft text-lead",
  nearby_business: "bg-place-soft text-place",
};

const dot: Record<Kind, string> = {
  job: "bg-job",
  community_lead: "bg-lead",
  nearby_business: "bg-[#e0a106]",
};

export function KindBadge({ kind, hiring = false }: { kind: Kind; hiring?: boolean }) {
  const tone = hiring ? "job" : kind;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${style[tone]}`}>
      <span className={`h-2 w-2 rounded-full ${dot[tone]}`} />
      {hiring ? "Hiring" : KIND_LABEL[kind]}
    </span>
  );
}
