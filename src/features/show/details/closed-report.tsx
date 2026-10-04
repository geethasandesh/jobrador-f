"use client";

import { useEffect, useState } from "react";
import { ApiError, myClosure, reportClosed, type ClosureReport } from "@/lib/api/client";

export function ClosedReport({ jobId, active }: { jobId: string; active: boolean }) {
  const [report, setReport] = useState<ClosureReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    void myClosure(jobId)
      .then((result) => {
        if (!cancelled) setReport(result.report);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [active, jobId]);

  if (!active) return null;
  if (report?.status === "pending") {
    return <p className="mt-3 text-sm text-muted">Waiting for a check. This pin stays green until it is confirmed.</p>;
  }
  if (report?.status === "confirmed") {
    return <p className="mt-3 text-sm text-muted">This posting was confirmed closed.</p>;
  }

  async function send() {
    setPending(true);
    setError(null);
    try {
      setReport(await reportClosed(jobId));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "That report did not go through.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-3">
      <button type="button" disabled={pending} onClick={() => void send()} className="rounded-full border border-line px-4 py-2 text-sm font-semibold disabled:opacity-60">
        {pending ? "Sending…" : "This posting is gone"}
      </button>
      {error ? <p className="mt-2 text-sm text-[#e11d48]">{error}</p> : null}
    </div>
  );
}
