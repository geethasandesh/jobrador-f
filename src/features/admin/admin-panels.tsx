"use client";

import { useState } from "react";
import { ApiError, markBugHandled, type Referral } from "@/lib/api/client";
import { useAdminData } from "@/features/admin/admin-shell";

function when(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AdminAnalytics() {
  const { overview } = useAdminData();
  const { counts } = overview;

  return (
    <section>
      <h1 className="text-3xl font-black tracking-tight">Analytics</h1>
      <p className="mt-1 text-sm text-muted">Counts from the database.</p>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Accounts" value={counts.users} />
        <Stat label="Referrals waiting" value={counts.referralsPending} />
        <Stat label="Referrals approved" value={counts.referralsApproved} />
        <Stat label="Referrals declined" value={counts.referralsDeclined} />
        <Stat label="Bug reports" value={counts.bugReports} />
        <Stat label="Live jobs" value={counts.jobs} />
        <Stat label="Student tips" value={counts.tips} />
        <Stat label="Business posts" value={counts.businessPosts} />
        <Stat label="Wall notes" value={counts.wallNotes} />
      </div>
    </section>
  );
}

export function AdminAccounts() {
  const { overview } = useAdminData();
  const { accounts } = overview;

  return (
    <section>
      <h1 className="text-3xl font-black tracking-tight">Accounts</h1>
      <p className="mt-1 text-sm text-muted">People who have signed up.</p>
      {accounts === null ? <p className="mt-3 text-sm text-muted">The account list is not available from this database login.</p> : null}
      {accounts?.length === 0 ? <p className="mt-3 text-sm text-muted">No accounts yet.</p> : null}
      {accounts && accounts.length > 0 ? (
        <ul className="mt-4 divide-y divide-line rounded-3xl border border-line">
          {accounts.map((account) => (
            <li key={`${account.email}-${account.createdAt}`} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <span className="truncate font-medium">{account.email}</span>
              <span className="shrink-0 text-muted">{when(account.createdAt)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

export function AdminReferrals() {
  const { overview, reviewing, review } = useAdminData();

  return (
    <section>
      <h1 className="text-3xl font-black tracking-tight">Referral reviews</h1>
      <p className="mt-1 text-sm text-muted">{overview.counts.referralsDeclined} declined.</p>
      {overview.referrals.pending.length === 0 ? <p className="mt-3 text-sm text-muted">Nothing is waiting.</p> : null}
      <ul className="mt-4 space-y-3">
        {overview.referrals.pending.map((item) => (
          <ReferralCard key={item.id} item={item} busy={reviewing === item.id} onReview={(action) => void review(item.id, action)} />
        ))}
      </ul>
      <h2 className="mt-8 text-sm font-semibold">History</h2>
      {overview.referrals.history.length === 0 ? <p className="mt-2 text-sm text-muted">No reviewed referrals yet.</p> : null}
      <ul className="mt-3 space-y-2">
        {overview.referrals.history.map((item) => (
          <li key={item.id} className="rounded-2xl border border-line px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
              {item.status === "approved" ? "Approved" : "Declined"} · {item.authorName} · {when(item.createdAt)}
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{item.message}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function AdminBugs() {
  const { overview, reload } = useAdminData();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const open = overview.bugs.filter((bug) => !bug.handledAt);
  const handled = overview.bugs.filter((bug) => bug.handledAt);

  async function handle(id: string) {
    setBusy(id);
    setError(null);
    try {
      await markBugHandled(id);
      await reload();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "That report could not be marked handled.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section>
      <h1 className="text-3xl font-black tracking-tight">Bugs</h1>
      <p className="mt-1 text-sm text-muted">Open reports stay here until you mark them handled.</p>
      {error ? <p className="mt-3 text-sm text-[#e11d48]">{error}</p> : null}
      {open.length === 0 ? <p className="mt-3 text-sm text-muted">No open bug reports.</p> : null}
      <ul className="mt-4 space-y-3">
        {open.map((bug) => (
          <li key={bug.id} className="rounded-3xl border border-line px-4 py-4">
            <p className="text-xs text-muted">
              {when(bug.createdAt)}
              {bug.page ? ` · ${bug.page}` : ""}
              {bug.email ? ` · ${bug.email}` : ""}
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{bug.message}</p>
            <button type="button" disabled={busy === bug.id} onClick={() => void handle(bug.id)} className="mt-4 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
              Mark handled
            </button>
          </li>
        ))}
      </ul>
      <h2 className="mt-8 text-sm font-semibold">Handled</h2>
      {handled.length === 0 ? <p className="mt-2 text-sm text-muted">Nothing has been marked handled yet.</p> : null}
      <ul className="mt-3 space-y-2">
        {handled.map((bug) => (
          <li key={bug.id} className="rounded-2xl border border-line px-4 py-3">
            <p className="text-xs text-muted">
              {when(bug.handledAt ?? bug.createdAt)}
              {bug.page ? ` · ${bug.page}` : ""}
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted">{bug.message}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number | null }) {
  return (
    <article className="rounded-3xl border border-line px-4 py-4">
      <p className="text-3xl font-black tracking-tight">{value === null ? "—" : value}</p>
      <p className="mt-1 text-xs font-medium text-muted">{label}</p>
    </article>
  );
}

function ReferralCard({
  item,
  busy,
  onReview,
}: {
  item: Referral;
  busy: boolean;
  onReview: (action: "approve" | "reject") => void;
}) {
  return (
    <li className="rounded-3xl border border-line px-4 py-4">
      <p className="text-xs text-muted">
        {item.authorName} · {when(item.createdAt)}
      </p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{item.message}</p>
      <div className="mt-4 flex gap-2">
        <button type="button" disabled={busy} onClick={() => onReview("approve")} className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
          Approve
        </button>
        <button type="button" disabled={busy} onClick={() => onReview("reject")} className="rounded-full border border-line px-4 py-2 text-sm font-semibold disabled:opacity-60">
          Decline
        </button>
      </div>
    </li>
  );
}
