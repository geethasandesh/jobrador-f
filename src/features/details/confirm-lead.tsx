"use client";

import { useState } from "react";
import { ApiError, confirmLead } from "@/lib/api/client";

const votes = [
  { status: "yes", label: "Yes, still hiring" },
  { status: "no", label: "This is outdated" },
  { status: "unsure", label: "Not sure" },
] as const;

export function ConfirmLead({
  id,
  initial,
}: {
  id: string;
  initial: { yes: number; no: number; unsure: number };
}) {
  const [counts, setCounts] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function vote(status: "yes" | "no" | "unsure") {
    setPending(true);
    setMessage(null);
    try {
      const result = await confirmLead(id, status);
      setCounts({
        yes: result.lead.confirmYes,
        no: result.lead.confirmNo,
        unsure: result.lead.confirmUnsure,
      });
      setMessage("Recorded. Accounts will stop the same person voting twice.");
    } catch (caught) {
      setMessage(caught instanceof ApiError ? caught.message : "Could not record that.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-line bg-card p-4">
      <h2 className="font-semibold">Is this still hiring?</h2>
      <p className="mt-1 text-sm text-muted">
        {counts.yes} confirmed · {counts.no} {counts.no === 1 ? "says" : "say"} outdated · {counts.unsure} not sure
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {votes.map((item) => (
          <button
            key={item.status}
            type="button"
            disabled={pending}
            onClick={() => vote(item.status)}
            className="rounded-full border border-line px-3 py-2 text-sm font-medium disabled:opacity-60"
          >
            {item.label}
          </button>
        ))}
      </div>
      {message ? <p className="mt-3 text-sm text-muted">{message}</p> : null}
    </section>
  );
}
