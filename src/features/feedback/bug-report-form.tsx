"use client";

import { useState, type FormEvent } from "react";
import { ApiError, sendBugReport } from "@/lib/api/client";

export function BugReportForm() {
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [page, setPage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await sendBugReport({
        message,
        email: email.trim() || undefined,
        page: page.trim() || undefined,
      });
      setSent(true);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not send the report.");
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return <p className="mt-8 text-sm">Sent. Thank you for telling us.</p>;
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-4">
      <label className="block text-sm font-medium">
        What went wrong
        <textarea
          className="field mt-1 min-h-32"
          required
          minLength={10}
          maxLength={2000}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />
      </label>
      <label className="block text-sm font-medium">
        Which page
        <input
          className="field mt-1"
          value={page}
          maxLength={200}
          placeholder="Optional, for example /map"
          onChange={(event) => setPage(event.target.value)}
        />
      </label>
      <label className="block text-sm font-medium">
        Your email
        <input
          className="field mt-1"
          type="email"
          value={email}
          placeholder="Optional, if you want a reply"
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>
      {error ? <p className="text-sm text-[#e11d48]">{error}</p> : null}
      <button type="submit" disabled={pending} className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
        {pending ? "Sending…" : "Send report"}
      </button>
    </form>
  );
}
