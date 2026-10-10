"use client";

import { useEffect, useState } from "react";
import { FactList } from "@/components/fact-list";
import { ReadableText } from "@/components/readable-text";
import { ClosedReport } from "@/features/show/details/closed-report";
import { ConfirmLead } from "@/features/show/details/confirm-lead";
import { RecordActions } from "@/features/show/details/record-actions";
import { ApiError, getBusiness, getJob, getLead } from "@/lib/api/client";
import { OwnedPostActions } from "@/features/show/report/my-posts";
import type { BusinessDetail, JobDetail, Kind, LeadDetail, Opportunity } from "@/lib/api/types";
import { formatDistance, formatWhen } from "@/lib/format";
import { categoryLabel, jobTypeLabel, PLACE_CHECKED_EMPTY, PLACE_CHECKING, sourceLabel } from "@/lib/labels";

const statusBar: Record<Kind, { label: string; className: string }> = {
  job: { label: "JOB LISTING", className: "bg-[#22c55e]" },
  community_lead: { label: "STUDENT REPORT", className: "bg-[#3b82f6]" },
  nearby_business: { label: "ASK IN PERSON", className: "bg-[#f59e0b]" },
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
  const hiring = Boolean(item?.hiring && current.kind === "nearby_business" && current.id === item.id);
  const businessPost = item?.poster === "business" && current.kind === "community_lead";
  const status = businessPost
    ? { label: "BUSINESS POST", className: "bg-[#7c3aed]" }
    : hiring
      ? { label: "HIRING", className: "bg-[#22c55e]" }
      : item?.status === "UNCHECKED" && current.kind === "nearby_business"
        ? { label: "CHECKING", className: "bg-[#9ca3af]" }
        : statusBar[current.kind];

  useEffect(() => {
    setFocus(null);
  }, [id]);

  if (!expanded && !item) return null;

  return (
    <article
      className={`absolute right-3 z-[700] flex flex-col overflow-hidden rounded-2xl bg-white shadow-[0_18px_50px_rgba(17,17,17,0.18)] sm:right-4 ${
        expanded
          ? "top-4 max-h-[calc(100%-6.5rem)] w-[min(100%-1.5rem,420px)] sm:max-h-[calc(100%-2rem)]"
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
          <Preview
            item={item}
            onClose={onClose}
            onExpand={onExpand}
            onOpen={(nextId, nextKind) => {
              setFocus({ id: nextId, kind: nextKind });
              onExpand();
            }}
          />
        ) : null}
      </div>
    </article>
  );
}

function Preview({
  item,
  onClose,
  onExpand,
  onOpen,
}: {
  item: Opportunity;
  onClose: () => void;
  onExpand: () => void;
  onOpen: (id: string, kind: Kind) => void;
}) {
  const initials = item.businessName
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const hiring = item.kind === "nearby_business" && Boolean(item.hiring);
  const path = item.kind === "job" ? "jobs" : item.kind === "community_lead" ? "leads" : "businesses";

  return (
    <>
      <div className="flex items-start justify-between">
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-zinc-100 text-sm font-black">{initials}</span>
        <button type="button" onClick={onClose} className="text-xl leading-none text-muted" aria-label="Close">
          ×
        </button>
      </div>
      <h2 className="mt-3 text-xl font-bold tracking-tight">{item.businessName}</h2>
      <p className="text-sm text-muted">
        {categoryLabel(item.category)} · {formatDistance(item.distanceKm)} away
      </p>
      {item.kind === "nearby_business" ? (
        hiring ? (
          <div className="mt-3">
            <p className="text-sm font-semibold text-job">Hiring</p>
            <p className="mt-1 font-semibold">{item.linkedJobTitle}</p>
            {item.linkedJobType ? <p className="text-sm text-muted">{jobTypeLabel(item.linkedJobType)}</p> : null}
          </div>
        ) : (
          <p className={`mt-3 text-sm font-semibold ${item.status === "UNCHECKED" ? "text-muted" : "text-place"}`}>
            {item.status === "UNCHECKED" ? PLACE_CHECKING : PLACE_CHECKED_EMPTY}
          </p>
        )
      ) : (
        <p className="mt-3 text-sm text-muted">{item.title}</p>
      )}
      {item.address ? <p className="mt-2 text-sm text-muted">{item.address}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        {hiring && item.linkedJobId ? (
          <button
            type="button"
            onClick={() => onOpen(item.linkedJobId ?? "", "job")}
            className="rounded-full bg-ink px-3.5 py-1.5 text-sm font-semibold text-white"
          >
            View job
          </button>
        ) : (
          <button type="button" onClick={onExpand} className="rounded-full bg-ink px-3.5 py-1.5 text-sm font-semibold text-white">
            {item.kind === "nearby_business" ? "View business" : "View details"}
          </button>
        )}
      </div>
      <RecordActions
        compact
        canSave={item.kind === "job" || item.kind === "nearby_business"}
        stop={{
          id: item.id,
          kind: item.kind,
          title: item.businessName,
          subtitle: hiring
            ? (item.linkedJobTitle ?? "Hiring")
            : item.kind === "nearby_business"
              ? item.status === "UNCHECKED"
                ? PLACE_CHECKING
                : PLACE_CHECKED_EMPTY
              : item.title,
          href: `/${path}/${item.id}`,
          latitude: item.latitude,
          longitude: item.longitude,
        }}
      />
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
  const [open, setOpen] = useState(false);
  const posted = formatWhen(job.postedAt);
  const facts = [
    job.jobType !== "OTHER" ? { label: "Job type", value: jobTypeLabel(job.jobType) } : null,
    job.category !== "other" ? { label: "Category", value: categoryLabel(job.category) } : null,
    job.hoursLabel ? { label: "Hours", value: job.hoursLabel } : null,
    job.salaryLabel ? { label: "Salary", value: job.salaryLabel } : null,
    job.languageLabel ? { label: "Language", value: job.languageLabel } : null,
    posted ? { label: "Posted", value: posted } : null,
    { label: "Source", value: sourceLabel(job.sourceName) },
  ].flatMap((row) => (row ? [row] : []));
  return (
    <>
      <h2 className="mt-3 text-2xl font-bold tracking-tight">{job.title}</h2>
      <p className="mt-1 text-sm">
        {business?.name ?? "Unknown business"}
        {job.distanceKm != null ? <span className="text-muted"> · {formatDistance(job.distanceKm)} away</span> : null}
      </p>
      {job.status !== "ACTIVE" ? (
        <p className="mt-3 rounded-xl bg-place-soft px-3 py-2 text-sm text-place">
          This listing is {job.status.toLowerCase()} and is hidden from the map.
        </p>
      ) : null}
      {open ? <ReadableText text={job.descriptionSummary} /> : <p className="mt-3 line-clamp-3 text-sm leading-6">{job.descriptionSummary}</p>}
      {open ? <FactList rows={facts} /> : null}
      <button type="button" onClick={() => setOpen((value) => !value)} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold" aria-expanded={open}>
        {open ? "See less" : "View more information"}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className={open ? "rotate-180" : ""}>
          <path d="M3.5 6 8 10.5 12.5 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <a
        href={job.sourceUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-4 inline-flex rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white"
      >
        Apply on original website
      </a>
      <p className="mt-2 text-xs text-muted">This opens the job’s own page. jobrador does not send the application.</p>
      <ClosedReport jobId={job.id} active={job.status === "ACTIVE"} />
      <RecordActions
        canSave
        stop={{
          id: job.id,
          kind: "job",
          title: business?.name ?? job.title,
          subtitle: job.title,
          href: `/jobs/${job.id}`,
          latitude: job.latitude,
          longitude: job.longitude,
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
        {reported ? ` · shared ${reported}` : ""}
      </p>
      <p className="mt-3 rounded-xl bg-lead-soft px-3 py-2 text-sm text-lead">
        {lead.poster === "business"
          ? lead.status === "FILLED"
            ? "Hiring is stopped. This post is off the map until you start it again."
            : "This business posted that they are hiring."
          : lead.status === "FILLED"
            ? "Hiring is finished. This tip is no longer on the map."
            : "A student shared this. It is not a confirmed vacancy."}
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
      {lead.poster === "business" ? (
        lead.mine ? <OwnedPostActions id={lead.id} status={lead.status} /> : null
      ) : (
        <ConfirmLead
          id={lead.id}
          initial={{
            yes: lead.confirmYes,
            no: lead.confirmNo,
            unsure: lead.confirmUnsure,
            done: lead.confirmDone,
            status: lead.status,
          }}
        />
      )}
      <RecordActions
        canSave={false}
        stop={{
          id: lead.id,
          kind: "community_lead",
          title: lead.businessName,
          subtitle: lead.title,
          href: `/leads/${lead.id}`,
          latitude: lead.latitude,
          longitude: lead.longitude,
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
      {activeJobs.length > 0 ? (
        <p className="mt-3 rounded-xl bg-job-soft px-3 py-2 text-sm font-semibold text-job">Hiring</p>
      ) : (
        <p className={`mt-3 rounded-xl px-3 py-2 text-sm ${business.hiringCheckedAt ? "bg-place-soft text-place" : "bg-zinc-100 text-muted"}`}>
          {business.hiringCheckedAt ? PLACE_CHECKED_EMPTY : PLACE_CHECKING}
        </p>
      )}
      <FactList
        rows={[
          { label: "Category", value: categoryLabel(business.category) },
          { label: "Address", value: business.address },
          { label: "Postal code", value: business.postalCode ?? null },
          { label: "Area", value: business.area },
          { label: "Hours", value: business.openingHours ?? null },
          { label: "Phone", value: business.phone ?? null },
        ]}
      />
      {business.website ? (
        <a href={business.website} target="_blank" rel="noreferrer" className="mt-4 inline-flex text-sm font-semibold">
          Website
        </a>
      ) : null}
      <RecordActions
        canSave
        stop={{
          id: business.id,
          kind: "nearby_business",
          title: business.name,
          subtitle: business.area,
          href: `/businesses/${business.id}`,
          latitude: business.latitude,
          longitude: business.longitude,
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
                    {job.salaryLabel ? ` · ${job.salaryLabel}` : ""}
                  </span>
                  <span className="mt-2 inline-flex text-sm font-semibold">View job</span>
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
                  <span className="mt-1 block text-sm text-muted">
                    {lead.status === "FILLED" ? "Hiring finished" : `${lead.confirmYes} confirmed`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
