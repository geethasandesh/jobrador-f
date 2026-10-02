import Link from "next/link";
import { notFound } from "next/navigation";
import { FactList } from "@/components/fact-list";
import { KindBadge } from "@/components/kind-badge";
import { SampleBanner } from "@/components/sample-banner";
import { RecordActions } from "@/features/details/record-actions";
import { getJob } from "@/lib/api/client";
import { formatDistance, formatWhen } from "@/lib/format";
import { categoryLabel, jobTypeLabel } from "@/lib/labels";
import { backToMap, readOrigin } from "@/lib/origin";

export default async function JobPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lat?: string; lng?: string }>;
}) {
  const { id } = await params;
  const origin = readOrigin(await searchParams);
  const detail = await getJob(id, origin);
  if (!detail) notFound();

  const { job, business, dataSource } = detail;
  const posted = formatWhen(job.postedAt);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <Link href={backToMap(origin)} className="text-sm font-semibold text-brand">
        Back to map
      </Link>
      <div className="mt-4">
        <SampleBanner dataSource={dataSource} />
      </div>
      {job.status !== "ACTIVE" ? (
        <p className="mt-3 rounded-xl bg-place-soft px-3 py-2 text-sm text-place">
          This listing is {job.status.toLowerCase()} and is hidden from the map.
        </p>
      ) : null}
      <div className="mt-4">
        <KindBadge kind="job" />
      </div>
      <h1 className="mt-3 font-serif text-4xl">{job.title}</h1>
      <p className="mt-2 text-lg text-ink">
        {business ? (
          <Link href={`/businesses/${business.id}${origin ? `?lat=${origin.latitude}&lng=${origin.longitude}` : ""}`} className="underline decoration-line underline-offset-4">
            {business.name}
          </Link>
        ) : (
          "Unknown business"
        )}
      </p>
      <p className="mt-1 text-sm text-muted">
        {business ? `${business.address}` : ""}
        {job.distanceKm != null ? ` · ${formatDistance(job.distanceKm)} away` : ""}
      </p>
      <FactList
        rows={[
          { label: "Job type", value: jobTypeLabel(job.jobType) },
          { label: "Category", value: categoryLabel(job.category) },
          { label: "Hours", value: job.hoursLabel ?? null },
          { label: "Salary", value: job.salaryLabel ?? null },
          { label: "Language", value: job.languageLabel ?? null },
          { label: "Posted", value: posted },
          { label: "Source", value: job.sourceName },
        ]}
      />
      <p className="mt-6 text-base leading-7">{job.descriptionSummary}</p>
      <div className="mt-6 flex flex-wrap gap-2">
        <a
          href={job.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white"
        >
          Apply on original website
        </a>
      </div>
      <p className="mt-2 text-sm text-muted">
        Sample source. This preview does not send an application.
      </p>
      <RecordActions
        canSave
        stop={{
          id: job.id,
          kind: "job",
          title: business?.name ?? job.title,
          subtitle: job.title,
          href: `/jobs/${job.id}`,
        }}
      />
    </main>
  );
}
