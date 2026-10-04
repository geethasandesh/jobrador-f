import Link from "next/link";
import { notFound } from "next/navigation";
import { FactList } from "@/components/fact-list";
import { KindBadge } from "@/components/kind-badge";
import { SampleBanner } from "@/components/sample-banner";
import { RecordActions } from "@/features/show/details/record-actions";
import { getBusiness } from "@/lib/api/client";
import { formatDistance } from "@/lib/format";
import { categoryLabel, jobTypeLabel } from "@/lib/labels";
import { backToMap, readOrigin } from "@/lib/origin";

export default async function BusinessPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lat?: string; lng?: string }>;
}) {
  const { id } = await params;
  const origin = readOrigin(await searchParams);
  const detail = await getBusiness(id, origin);
  if (!detail) notFound();

  const { business, jobs, leads, dataSource } = detail;
  const activeJobs = jobs.filter((job) => job.status === "ACTIVE");
  const inactiveJobs = jobs.filter((job) => job.status !== "ACTIVE");
  const query = origin ? `?lat=${origin.latitude}&lng=${origin.longitude}` : "";

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <Link href={backToMap(origin)} className="text-sm font-semibold text-brand">
        Back to map
      </Link>
      <div className="mt-4">
        <SampleBanner dataSource={dataSource} />
      </div>
      <div className="mt-4">
        <KindBadge kind="nearby_business" />
      </div>
      <h1 className="mt-3 font-serif text-4xl">{business.name}</h1>
      <p className="mt-2 text-sm text-muted">
        {business.address}
        {business.distanceKm != null ? ` · ${formatDistance(business.distanceKm)} away` : ""}
      </p>
      {activeJobs.length === 0 && leads.length === 0 ? (
        <p className="mt-4 rounded-2xl bg-place-soft px-4 py-3 text-sm text-place">
          No public vacancy found. You can visit and ask if they are currently hiring.
        </p>
      ) : null}
      <FactList
        rows={[
          { label: "Category", value: categoryLabel(business.category) },
          { label: "Area", value: business.area },
          { label: "Hours", value: business.openingHours ?? null },
          { label: "Phone", value: business.phone ?? null },
          { label: "Website", value: business.website ?? null },
        ]}
      />
      <RecordActions
        canSave
        stop={{
          id: business.id,
          kind: "nearby_business",
          title: business.name,
          subtitle: business.area,
          href: `/businesses/${business.id}`,
        }}
      />

      {activeJobs.length > 0 ? (
        <section className="mt-8">
          <h2 className="font-serif text-2xl">Job listings</h2>
          <ul className="mt-3 space-y-2">
            {activeJobs.map((job) => (
              <li key={job.id}>
                <Link href={`/jobs/${job.id}${query}`} className="block rounded-2xl border border-line bg-card px-4 py-3">
                  <span className="font-semibold">{job.title}</span>
                  <span className="mt-1 block text-sm text-muted">
                    {jobTypeLabel(job.jobType)}
                    {job.salaryLabel ? ` · ${job.salaryLabel}` : " · Salary not listed"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {leads.length > 0 ? (
        <section className="mt-8">
          <h2 className="font-serif text-2xl">Community leads</h2>
          <ul className="mt-3 space-y-2">
            {leads.map((lead) => (
              <li key={lead.id}>
                <Link href={`/leads/${lead.id}${query}`} className="block rounded-2xl border border-line bg-card px-4 py-3">
                  <span className="font-semibold">{lead.title}</span>
                  <span className="mt-1 block text-sm text-muted">
                    {lead.status === "FILLED" ? "Hiring finished" : `${lead.confirmYes} confirmed`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {inactiveJobs.length > 0 ? (
        <section className="mt-8">
          <h2 className="font-serif text-2xl">Not on the map</h2>
          <ul className="mt-3 space-y-2">
            {inactiveJobs.map((job) => (
              <li key={job.id}>
                <Link href={`/jobs/${job.id}${query}`} className="block rounded-2xl border border-dashed border-line px-4 py-3 text-muted">
                  {job.title} · {job.status.toLowerCase()}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
