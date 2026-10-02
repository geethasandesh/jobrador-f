"use client";

import { useEffect, useState } from "react";
import { FactList } from "@/components/fact-list";
import { ConfirmLead } from "@/features/show/details/confirm-lead";
import { RecordActions } from "@/features/show/details/record-actions";
import { ApiError, getBusiness, getJob, getLead } from "@/lib/api/client";
import type { BusinessDetail, JobDetail, Kind, LeadDetail, Opportunity } from "@/lib/api/types";
import { formatDistance, formatWhen } from "@/lib/format";
import { categoryLabel, jobTypeLabel, KIND_LABEL } from "@/lib/labels";

const statusBar: Record<Kind, { label: string; className: string }> = {
  job: { label: "JOB LISTING", className: "bg-[#22c55e]" },
  community_lead: { label: "STUDENT REPORT", className: "bg-[#3b82f6]" },
  nearby_business: { label: "NO PUBLIC VACANCY", className: "bg-[#f59e0b]" },
};

export function PlacePanel({
  id,
  kind,
  item,
  expanded,
  origin,
  onClose,
  onExpand,
  onCollapse,
}: {
  id: string;
  kind: Kind;
  item: Opportunity | null;
  expanded: boolean;
  origin: { latitude: number; longitude: number };
  onClose: () => void;
  onExpand: () => void;
  onCollapse: () => void;
}) {
  const [focus, setFocus] = useState<{ id: string; kind: Kind } | null>(null);
  const current = focus ?? { id, kind };
  const status = statusBar[current.kind];

  useEffect(() => {
    setFocus(null);
  }, [id]);

  if (!expanded && !item) return null;

  return (
    <article
      className={`absolute right-3 z-[700] flex flex-col overflow-hidden rounded-2xl bg-white shadow-[0_18px_50px_rgba(17,17,17,0.18)] sm:right-4 ${
        expanded
          ? "top-4 bottom-24 w-[min(100%-1.5rem,420px)] sm:bottom-4"
          : "bottom-24 w-[min(100%-1.5rem,320px)] sm:top-4 sm:bottom-auto"
      }`}
    >
      <div className={`${status.className} shrink-0 py-1.5 text-center text-[11px] font-bold tracking-[0.14em] text-white`}>
        {status.label}
      </div>
      <div className={expanded ? "min-h-0 flex-1 overflow-y-auto p-4" : "p-4"}>
        {expanded ? (
          <DetailBody
            id={current.id}
            kind={current.kind}
            origin={origin}
            nested={focus !== null}
            onBack={() => setFocus(null)}
            onOpen={(nextId, nextKind) => setFocus({ id: nextId, kind: nextKind })}
            onCollapse={onCollapse}
            onClose={onClose}
          />
        ) : item ? (
          <Preview item={item} onClose={onClose} onExpand={onExpand} />
        ) : null}
      </div>
    </article>
  );
}

function Preview({ item, onClose, onExpand }: { item: Opportunity; onClose: () => void; onExpand: () => void }) {
  const initials = item.businessName
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <>
      <div className="flex items-start justify-between">
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-zinc-100 text-sm font-black">{initials}</span>
        <button type="button" onClick={onClose} className="text-xl leading-none text-muted" aria-label="Close">
          ×
        </button>
      </div>
      <h2 className="mt-3 text-xl font-bold tracking-tight">{item.businessName}</h2>
      <p className="text-sm text-muted">{item.kind === "nearby_business" ? "No public vacancy" : item.title}</p>
      <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
        <span>{formatDistance(item.distanceKm)} away</span>
        <span>{item.jobType ? jobTypeLabel(item.jobType) : categoryLabel(item.category)}</span>
        {item.salaryLabel ? <span>{item.salaryLabel}</span> : <span>Salary not listed</span>}
      </p>
      <p className="mt-2 text-xs text-muted">{KIND_LABEL[item.kind]} · {item.area}</p>
      <button type="button" onClick={onExpand} className="mt-4 inline-flex rounded-full bg-ink px-3.5 py-1.5 text-sm font-semibold text-white">
        View details
      </button>
    </>
  );
}

function DetailBody({
  id,
  kind,
  origin,
  nested,
  onBack,
  onOpen,
  onCollapse,
  onClose,
}: {
  id: string;
  kind: Kind;
  origin: { latitude: number; longitude: number };
  nested: boolean;
  onBack: () => void;
  onOpen: (id: string, kind: Kind) => void;
  onCollapse: () => void;
  onClose: () => void;
}) {
  const latitude = origin.latitude;
  const longitude = origin.longitude;
  const [job, setJob] = useState<JobDetail | null>(null);
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [business, setBusiness] = useState<BusinessDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setJob(null);
    setLead(null);
    setBusiness(null);
    const request =
      kind === "job"
        ? getJob(id, { latitude, longitude })
        : kind === "community_lead"
          ? getLead(id, { latitude, longitude })
          : getBusiness(id, { latitude, longitude });
    request
      .then((result) => {
        if (controller.signal.aborted) return;
        if (!result) {
          setError("This place is no longer available.");
          return;
        }
        if (kind === "job") setJob(result as JobDetail);
        else if (kind === "community_lead") setLead(result as LeadDetail);
        else setBusiness(result as BusinessDetail);
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted) return;
        setError(caught instanceof ApiError ? caught.message : "Could not load the details.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id, kind, latitude, longitude]);

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        {nested ? (
          <button type="button" onClick={onBack} className="text-sm font-semibold">
            Back
          </button>
        ) : (
          <button type="button" onClick={onCollapse} className="text-sm font-semibold">
            Show less
          </button>
        )}
        <button type="button" onClick={onClose} className="text-xl leading-none text-muted" aria-label="Close">
          ×
        </button>
      </div>
      {loading ? <p className="mt-4 text-sm text-muted">Loading details…</p> : null}
      {error ? <p className="mt-4 text-sm">{error}</p> : null}
      {job ? <JobBody detail={job} /> : null}
      {lead ? <LeadBody detail={lead} onOpen={onOpen} /> : null}
      {business ? <BusinessBody detail={business} onOpen={onOpen} /> : null}
    </>
  );
}

function JobBody({ detail }: { detail: JobDetail }) {
  const { job, business } = detail;
  const posted = formatWhen(job.postedAt);
  return (
    <>
      <h2 className="mt-3 text-2xl font-bold tracking-tight">{job.title}</h2>
      <p className="mt-1 text-sm">{business?.name ?? "Unknown business"}</p>
      <p className="mt-1 text-sm text-muted">
        {business?.address ?? ""}
        {job.distanceKm != null ? ` · ${formatDistance(job.distanceKm)} away` : ""}
      </p>
      {job.status !== "ACTIVE" ? (
        <p className="mt-3 rounded-xl bg-place-soft px-3 py-2 text-sm text-place">
          This listing is {job.status.toLowerCase()} and is hidden from the map.
        </p>
      ) : null}
      <p className="mt-4 text-sm leading-6">{job.descriptionSummary}</p>
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
      <a
        href={job.sourceUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-4 inline-flex rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white"
      >
        Apply on original website
      </a>
      <p className="mt-2 text-xs text-muted">Sample source. This preview does not send an application.</p>
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
    </>
  );
}

function LeadBody({
  detail,
  onOpen,
}: {
  detail: LeadDetail;
  onOpen: (id: string, kind: Kind) => void;
}) {
  const { lead, business } = detail;
  const reported = formatWhen(lead.reportedAt);
  return (
    <>
      <h2 className="mt-3 text-2xl font-bold tracking-tight">{lead.businessName}</h2>
      <p className="mt-1 text-sm">{lead.title}</p>
      <p className="mt-1 text-sm text-muted">
        {lead.address}
        {lead.distanceKm != null ? ` · ${formatDistance(lead.distanceKm)} away` : ""}
        {reported ? ` · reported ${reported}` : ""}
      </p>
      <p className="mt-3 rounded-xl bg-lead-soft px-3 py-2 text-sm text-lead">
        A student reported this. It is not a confirmed vacancy.
      </p>
      <p className="mt-4 text-sm leading-6">{lead.description}</p>
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
        <button type="button" onClick={() => onOpen(business.id, "nearby_business")} className="mt-4 text-sm font-semibold">
          View the business
        </button>
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
    </>
  );
}

function BusinessBody({
  detail,
  onOpen,
}: {
  detail: BusinessDetail;
  onOpen: (id: string, kind: Kind) => void;
}) {
  const { business, jobs, leads } = detail;
  const activeJobs = jobs.filter((job) => job.status === "ACTIVE");
  return (
    <>
      <h2 className="mt-3 text-2xl font-bold tracking-tight">{business.name}</h2>
      <p className="mt-1 text-sm text-muted">
        {business.address}
        {business.distanceKm != null ? ` · ${formatDistance(business.distanceKm)} away` : ""}
      </p>
      {activeJobs.length === 0 && leads.length === 0 ? (
        <p className="mt-3 rounded-xl bg-place-soft px-3 py-2 text-sm text-place">
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
        canSave={false}
        stop={{
          id: business.id,
          kind: "nearby_business",
          title: business.name,
          subtitle: business.area,
          href: `/businesses/${business.id}`,
        }}
      />
      {activeJobs.length > 0 ? (
        <section className="mt-5">
          <h3 className="text-sm font-bold">Job listings</h3>
          <ul className="mt-2 space-y-2">
            {activeJobs.map((job) => (
              <li key={job.id}>
                <button type="button" onClick={() => onOpen(job.id, "job")} className="w-full rounded-2xl border border-line px-3 py-2 text-left">
                  <span className="font-semibold">{job.title}</span>
                  <span className="mt-1 block text-sm text-muted">
                    {jobTypeLabel(job.jobType)}
                    {job.salaryLabel ? ` · ${job.salaryLabel}` : " · Salary not listed"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {leads.length > 0 ? (
        <section className="mt-5">
          <h3 className="text-sm font-bold">Community leads</h3>
          <ul className="mt-2 space-y-2">
            {leads.map((lead) => (
              <li key={lead.id}>
                <button type="button" onClick={() => onOpen(lead.id, "community_lead")} className="w-full rounded-2xl border border-line px-3 py-2 text-left">
                  <span className="font-semibold">{lead.title}</span>
                  <span className="mt-1 block text-sm text-muted">{lead.confirmYes} confirmed</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
