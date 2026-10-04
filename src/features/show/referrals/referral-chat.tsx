"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ApiError,
  getReferralQueue,
  getReferrals,
  reviewReferral,
  sendReferral,
  type Referral,
} from "@/lib/api/client";
import { setReferralOpen, useReferralOpen } from "@/lib/referral-panel";
import { useAuthReady, useSession } from "@/lib/session";

function when(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLine(item: Referral) {
  if (!item.mine) return null;
  if (item.status === "pending") return "Waiting for review";
  if (item.status === "rejected") return "Not posted";
  return null;
}

function MessageBody({ text, light }: { text: string; light?: boolean }) {
  const parts = text.split(/(https?:\/\/[^\s]+|www\.[^\s]+)/g);
  return (
    <p className="whitespace-pre-wrap text-sm leading-6">
      {parts.map((part, index) => {
        if (!/^(https?:\/\/|www\.)/i.test(part)) return <span key={index}>{part}</span>;
        const href = part.startsWith("www.") ? `https://${part}` : part;
        return (
          <a key={index} href={href} target="_blank" rel="noreferrer" className={light ? "underline" : "font-semibold underline"}>
            {part}
          </a>
        );
      })}
    </p>
  );
}

export function ReferralDock() {
  const open = useReferralOpen();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const authReady = useAuthReady();
  const session = useSession();
  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const [view, setView] = useState<"chat" | "queue">("chat");
  const [items, setItems] = useState<Referral[]>([]);
  const [pending, setPending] = useState<Referral[]>([]);
  const [history, setHistory] = useState<Referral[]>([]);
  const [admin, setAdmin] = useState(false);
  const [waiting, setWaiting] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [reviewing, setReviewing] = useState<string | null>(null);

  useEffect(() => {
    if (pathname === "/admin" || pathname.startsWith("/admin/")) setReferralOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (searchParams.get("referrals") !== "1" || !authReady) return;
    if (!session) {
      router.replace(`/login?next=${encodeURIComponent(`${pathname}?referrals=1`)}`);
      return;
    }
    setReferralOpen(true);
    const next = new URLSearchParams(searchParams.toString());
    next.delete("referrals");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [authReady, pathname, router, searchParams, session]);

  async function loadChat() {
    const data = await getReferrals();
    setItems(data.referrals);
    setAdmin(data.admin);
    setWaiting(data.pendingCount);
  }

  async function loadQueue() {
    const data = await getReferralQueue();
    setPending(data.pending);
    setHistory(data.history);
    setWaiting(data.pending.length);
  }

  useEffect(() => {
    if (!open || !session) return;
    setLoading(true);
    loadChat()
      .catch((caught) => setError(caught instanceof ApiError ? caught.message : "The referrals did not load."))
      .finally(() => setLoading(false));
    input.current?.focus();
  }, [open, session]);

  useEffect(() => {
    if (!open || view !== "chat") return;
    const node = scroller.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [items, open, view, loading]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") setReferralOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function openQueue() {
    setError(null);
    setView("queue");
    try {
      await loadQueue();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "The queue did not load.");
    }
  }

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    const text = message.trim();
    if (!text || sending) return;
    setError(null);
    setSending(true);
    try {
      const created = await sendReferral({ message: text });
      setMessage("");
      setItems((current) => [...current, created]);
      if (admin) setWaiting((count) => count + 1);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "The referral could not be sent.");
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  }

  async function review(id: string, action: "approve" | "reject") {
    setError(null);
    setReviewing(id);
    try {
      await reviewReferral(id, action);
      await Promise.all([loadQueue(), loadChat()]);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "That review did not go through.");
    } finally {
      setReviewing(null);
    }
  }

  if (!open) return null;

  return (
    <aside className="fixed inset-y-0 right-0 z-[1100] flex w-full flex-col border-l border-line bg-white shadow-[-16px_0_40px_rgba(17,17,17,0.12)] sm:w-[400px]">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-sm font-black tracking-tight">{view === "queue" ? "Review queue" : "Referrals"}</h2>
          <p className="truncate text-xs text-muted">
            {view === "queue" ? "Approved notes show in the chat." : "It appears here after it is approved."}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {admin && view === "chat" ? (
            <button type="button" onClick={() => void openQueue()} className="rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white">
              Queue{waiting > 0 ? ` ${waiting}` : ""}
            </button>
          ) : null}
          {view === "queue" ? (
            <button type="button" onClick={() => setView("chat")} className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold">
              Chat
            </button>
          ) : null}
          <button type="button" onClick={() => setReferralOpen(false)} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-full hover:bg-zinc-100">
            ×
          </button>
        </div>
      </div>

      {view === "queue" ? (
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {pending.length === 0 ? <p className="text-sm text-muted">Nothing is waiting.</p> : null}
          {pending.map((item) => (
            <article key={item.id} className="rounded-2xl border border-line px-3 py-3">
              <p className="text-xs text-muted">{when(item.createdAt)}</p>
              <div className="mt-2">
                <MessageBody text={item.message} />
              </div>
              <div className="mt-3 flex gap-2">
                <button type="button" disabled={reviewing === item.id} onClick={() => void review(item.id, "approve")} className="rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">
                  Approve
                </button>
                <button type="button" disabled={reviewing === item.id} onClick={() => void review(item.id, "reject")} className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold disabled:opacity-60">
                  Decline
                </button>
              </div>
            </article>
          ))}
          <section>
            <h3 className="text-xs font-semibold">History</h3>
            {history.length === 0 ? <p className="mt-2 text-sm text-muted">No reviewed referrals yet.</p> : null}
            <ul className="mt-2 space-y-2">
              {history.map((item) => (
                <li key={item.id} className="rounded-2xl border border-line px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                    {item.status === "approved" ? "Approved" : "Declined"} · {when(item.createdAt)}
                  </p>
                  <div className="mt-2">
                    <MessageBody text={item.message} />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : (
        <div ref={scroller} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {loading ? <p className="text-sm text-muted">Loading…</p> : null}
          {!loading && items.length === 0 ? (
            <p className="px-4 pt-16 text-center text-sm leading-6 text-muted">No referrals yet. Type one below.</p>
          ) : null}
          {items.map((item) => (
            <article key={item.id} className={`flex ${item.mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[88%] rounded-2xl px-3 py-2 ${item.mine ? "bg-ink text-white" : "bg-zinc-100 text-ink"}`}>
                <MessageBody text={item.message} light={item.mine} />
                <p className={`mt-1 text-[11px] ${item.mine ? "text-white/60" : "text-muted"}`}>
                  {statusLine(item) ? `${statusLine(item)} · ` : ""}
                  {when(item.createdAt)}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}

      {error ? <p className="px-4 pb-1 text-sm text-[#e11d48]">{error}</p> : null}

      {view === "chat" ? (
        <form onSubmit={(event) => void submit(event)} className="border-t border-line p-3">
          <div className="flex items-end gap-2 rounded-2xl border border-line bg-white px-3 py-2">
            <textarea
              ref={input}
              value={message}
              rows={1}
              placeholder="Write a referral"
              className="max-h-32 min-h-8 flex-1 resize-none bg-transparent py-1 text-sm outline-none"
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={onKeyDown}
            />
            <button type="submit" disabled={sending || !message.trim()} aria-label="Send" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink text-white disabled:opacity-40">
              <SendIcon />
            </button>
          </div>
        </form>
      ) : null}
    </aside>
  );
}

function SendIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
