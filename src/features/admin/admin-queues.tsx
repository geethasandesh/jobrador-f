"use client";

import { useEffect, useState } from "react";
import {
  ApiError,
  getAdminClosures,
  getAdminPlaces,
  getAdminPosts,
  getAdminWall,
  reviewClosure,
  setAdminNoteHidden,
  setAdminPostHidden,
  type AdminPlace,
  type AdminPlaceTone,
  type AdminPost,
  type AdminWallNote,
  type ClosureReport,
} from "@/lib/api/client";

const TONES: Array<{ id: AdminPlaceTone; label: string }> = [
  { id: "unchecked", label: "Not checked" },
  { id: "hiring", label: "Real posting" },
  { id: "empty", label: "No public vacancy" },
  { id: "tip", label: "Student tip" },
];

function when(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AdminPlaces() {
  const [tone, setTone] = useState<AdminPlaceTone>("unchecked");
  const [query, setQuery] = useState("");
  const [places, setPlaces] = useState<AdminPlace[]>([]);
  const [counts, setCounts] = useState<Record<AdminPlaceTone, number> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const handle = window.setTimeout(() => {
      void getAdminPlaces(tone, query.trim())
        .then((result) => {
          if (cancelled) return;
          setPlaces(result.places);
          setCounts(result.counts);
          setError(null);
        })
        .catch((caught) => {
          if (cancelled) return;
          setError(caught instanceof ApiError ? caught.message : "Places did not load.");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [tone, query]);

  return (
    <section>
      <h1 className="text-3xl font-black tracking-tight">Places</h1>
      <p className="mt-1 text-sm text-muted">Not checked is the work queue. Real postings are pins we can open.</p>
      <div className="mt-5 flex gap-2 overflow-x-auto">
        {TONES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTone(item.id)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${tone === item.id ? "bg-ink text-white" : "border border-line"}`}
          >
            {item.label}
            {counts ? ` ${counts[item.id]}` : ""}
          </button>
        ))}
      </div>
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search name or area"
        className="field mt-4"
      />
      {error ? <p className="mt-3 text-sm text-[#e11d48]">{error}</p> : null}
      {loading ? <p className="mt-4 text-sm text-muted">Loading places…</p> : null}
      {!loading && places.length === 0 ? <p className="mt-4 text-sm text-muted">Nothing in this list.</p> : null}
      <ul className="mt-4 divide-y divide-line rounded-3xl border border-line">
        {places.map((place) => (
          <li key={`${place.tone}-${place.id}`} className="px-4 py-3">
            <a href={place.href} className="font-semibold">
              {place.name}
            </a>
            <p className="mt-1 text-sm text-muted">
              {place.detail}
              {place.area ? ` · ${place.area}` : ""}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function AdminTips() {
  const [posts, setPosts] = useState<AdminPost[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    setPosts(await getAdminPosts().then((result) => result.posts));
  }

  useEffect(() => {
    void load().catch((caught) => setError(caught instanceof ApiError ? caught.message : "Tips did not load."));
  }, []);

  async function hide(id: string, hidden: boolean) {
    setBusy(id);
    setError(null);
    try {
      await setAdminPostHidden(id, hidden);
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "That post could not be updated.");
    } finally {
      setBusy(null);
    }
  }

  const visible = posts?.filter((post) => !post.hidden) ?? [];
  const hidden = posts?.filter((post) => post.hidden) ?? [];

  return (
    <section>
      <h1 className="text-3xl font-black tracking-tight">Tips</h1>
      <p className="mt-1 text-sm text-muted">Hide a wrong student tip or a business claim. Hidden posts leave the map.</p>
      {error ? <p className="mt-3 text-sm text-[#e11d48]">{error}</p> : null}
      {posts === null ? <p className="mt-4 text-sm text-muted">Loading tips…</p> : null}
      <PostList title="On the map" posts={visible} busy={busy} action="Hide" onAction={(id) => void hide(id, true)} />
      <PostList title="Hidden" posts={hidden} busy={busy} action="Put back" onAction={(id) => void hide(id, false)} />
    </section>
  );
}

function PostList({
  title,
  posts,
  busy,
  action,
  onAction,
}: {
  title: string;
  posts: AdminPost[];
  busy: string | null;
  action: string;
  onAction: (id: string) => void;
}) {
  return (
    <>
      <h2 className="mt-8 text-sm font-semibold">{title}</h2>
      {posts.length === 0 ? <p className="mt-2 text-sm text-muted">None.</p> : null}
      <ul className="mt-3 space-y-3">
        {posts.map((post) => (
          <li key={post.id} className="rounded-3xl border border-line px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
              {post.poster === "business" ? "Business post" : "Student tip"} · {when(post.createdAt)}
            </p>
            <p className="mt-2 font-semibold">{post.name}</p>
            <p className="mt-1 text-sm leading-6">{post.title}</p>
            <button type="button" disabled={busy === post.id} onClick={() => onAction(post.id)} className="mt-4 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {action}
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

export function AdminWall() {
  const [notes, setNotes] = useState<AdminWallNote[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    setNotes(await getAdminWall().then((result) => result.notes));
  }

  useEffect(() => {
    void load().catch((caught) => setError(caught instanceof ApiError ? caught.message : "The wall did not load."));
  }, []);

  async function hide(id: string, hidden: boolean) {
    setBusy(id);
    setError(null);
    try {
      await setAdminNoteHidden(id, hidden);
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "That note could not be updated.");
    } finally {
      setBusy(null);
    }
  }

  const visible = notes?.filter((note) => !note.hidden) ?? [];
  const hidden = notes?.filter((note) => note.hidden) ?? [];

  return (
    <section>
      <h1 className="text-3xl font-black tracking-tight">Wall</h1>
      <p className="mt-1 text-sm text-muted">Hide a note and it leaves the public wall.</p>
      {error ? <p className="mt-3 text-sm text-[#e11d48]">{error}</p> : null}
      {notes === null ? <p className="mt-4 text-sm text-muted">Loading notes…</p> : null}
      <NoteList title="On the wall" notes={visible} busy={busy} action="Hide" onAction={(id) => void hide(id, true)} />
      <NoteList title="Hidden" notes={hidden} busy={busy} action="Put back" onAction={(id) => void hide(id, false)} />
    </section>
  );
}

function NoteList({
  title,
  notes,
  busy,
  action,
  onAction,
}: {
  title: string;
  notes: AdminWallNote[];
  busy: string | null;
  action: string;
  onAction: (id: string) => void;
}) {
  return (
    <>
      <h2 className="mt-8 text-sm font-semibold">{title}</h2>
      {notes.length === 0 ? <p className="mt-2 text-sm text-muted">None.</p> : null}
      <ul className="mt-3 space-y-3">
        {notes.map((note) => (
          <li key={note.id} className="rounded-3xl border border-line px-4 py-4">
            <p className="text-xs text-muted">
              {note.displayName} · {when(note.createdAt)}
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{note.body}</p>
            <button type="button" disabled={busy === note.id} onClick={() => onAction(note.id)} className="mt-4 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {action}
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

export function AdminClosures() {
  const [pending, setPending] = useState<ClosureReport[]>([]);
  const [history, setHistory] = useState<ClosureReport[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    const result = await getAdminClosures();
    setPending(result.pending);
    setHistory(result.history);
  }

  useEffect(() => {
    void load()
      .catch((caught) => setError(caught instanceof ApiError ? caught.message : "Closure reports did not load."))
      .finally(() => setLoading(false));
  }, []);

  async function review(id: string, action: "confirm" | "dismiss") {
    setBusy(id);
    setError(null);
    try {
      await reviewClosure(id, action);
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "That review did not go through.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section>
      <h1 className="text-3xl font-black tracking-tight">Job closed</h1>
      <p className="mt-1 text-sm text-muted">Confirm a report and that posting leaves the map. If nothing else is open, the place shows no public vacancy.</p>
      {error ? <p className="mt-3 text-sm text-[#e11d48]">{error}</p> : null}
      {loading ? <p className="mt-4 text-sm text-muted">Loading reports…</p> : null}
      {!loading && pending.length === 0 ? <p className="mt-4 text-sm text-muted">Nothing is waiting.</p> : null}
      <ul className="mt-4 space-y-3">
        {pending.map((report) => (
          <li key={report.id} className="rounded-3xl border border-line px-4 py-4">
            <p className="text-xs text-muted">{when(report.createdAt)}</p>
            <p className="mt-2 font-semibold">{report.placeName}</p>
            <p className="mt-1 text-sm">{report.jobTitle}</p>
            <div className="mt-4 flex gap-2">
              <button type="button" disabled={busy === report.id} onClick={() => void review(report.id, "confirm")} className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                Confirm closed
              </button>
              <button type="button" disabled={busy === report.id} onClick={() => void review(report.id, "dismiss")} className="rounded-full border border-line px-4 py-2 text-sm font-semibold disabled:opacity-60">
                Keep it open
              </button>
            </div>
          </li>
        ))}
      </ul>
      <h2 className="mt-8 text-sm font-semibold">History</h2>
      {history.length === 0 ? <p className="mt-2 text-sm text-muted">No reviewed reports yet.</p> : null}
      <ul className="mt-3 space-y-2">
        {history.map((report) => (
          <li key={report.id} className="rounded-2xl border border-line px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
              {report.status === "confirmed" ? "Confirmed closed" : "Kept open"} · {when(report.createdAt)}
            </p>
            <p className="mt-2 text-sm">
              {report.placeName} · {report.jobTitle}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
