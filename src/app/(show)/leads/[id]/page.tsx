import Link from "next/link";
import { notFound } from "next/navigation";
import { FactList } from "@/components/fact-list";
import { KindBadge } from "@/components/kind-badge";
import { SampleBanner } from "@/components/sample-banner";
import { ConfirmLead } from "@/features/show/details/confirm-lead";
import { RecordActions } from "@/features/show/details/record-actions";
import { getLead } from "@/lib/api/client";
import { formatDistance, formatWhen } from "@/lib/format";
import { categoryLabel, jobTypeLabel } from "@/lib/labels";
import { backToMap, readOrigin } from "@/lib/origin";

export default async function LeadPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lat?: string; lng?: string }>;
}) {
  const { id } = await params;
  const origin = readOrigin(await searchParams);
  const detail = await getLead(id, origin);
  if (!detail) notFound();

  const { lead, business, dataSource } = detail;
  const reported = formatWhen(lead.reportedAt);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <Link href={backToMap(origin)} className="text-sm font-semibold text-brand">
        Back to map
      </Link>
      <div className="mt-4">
        <SampleBanner dataSource={dataSource} />
      </div>
      <div className="mt-4">
        <KindBadge kind="community_lead" />
      </div>
      <h1 className="mt-3 font-serif text-4xl">{lead.businessName}</h1>
      <p className="mt-2 text-lg">{lead.title}</p>
      <p className="mt-1 text-sm text-muted">
        {lead.address}
        {lead.distanceKm != null ? ` · ${formatDistance(lead.distanceKm)} away` : ""}
        {reported ? ` · reported ${reported}` : ""}
      </p>
      <p className="mt-4 rounded-2xl bg-lead-soft px-4 py-3 text-sm text-lead">
        A student reported this. It is not a confirmed vacancy.
      </p>
      <blockquote className="mt-6 border-l-4 border-lead pl-4 text-base leading-7">
        {lead.description}
      </blockquote>
      <FactList
        rows={[
          { label: "Job type", value: jobTypeLabel(lead.jobType) },
          { label: "Category", value: categoryLabel(lead.category) },
          { label: "Hours", value: lead.hoursLabel },
          { label: "Salary", value: lead.salaryLabel },
          { label: "Language", value: lead.languageLabel },
          { label: "Area", value: lead.area },
        ]}
      />
      {business ? (
        <p className="mt-4 text-sm">
          <Link className="font-semibold text-brand" href={`/businesses/${business.id}`}>
            View the business
          </Link>
        </p>
      ) : null}
      <ConfirmLead
        id={lead.id}
        initial={{ yes: lead.confirmYes, no: lead.confirmNo, unsure: lead.confirmUnsure }}
      />
      <RecordActions
        canSave={false}
        stop={{
          id: lead.id,
          kind: "community_lead",
          title: lead.businessName,
          subtitle: lead.title,
          href: `/leads/${lead.id}`,
        }}
      />
    </main>
  );
}
