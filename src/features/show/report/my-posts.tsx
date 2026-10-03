"use client";

import { useEffect, useState } from "react";
import { ApiError, listMyPosts, managePost, type MyPost } from "@/lib/api/client";

export function OwnedPostGate({ id, status, poster }: { id: string; status: string; poster?: string }) {
  const [mine, setMine] = useState(false);

  useEffect(() => {
    if (poster !== "business") return;
    let gone = false;
    listMyPosts()
      .then((result) => {
        if (!gone) setMine(result.leads.some((lead) => lead.id === id));
      })
      .catch(() => undefined);
    return () => {
      gone = true;
    };
  }, [id, poster]);

  if (!mine) return null;
  return <OwnedPostActions id={id} status={status} />;
}

export function OwnedPostActions({ id, status }: { id: string; status: string }) {
  const [current, setCurrent] = useState(status);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function act(action: "stop" | "delete" | "reopen") {
    setPending(true);
    setError(null);
    try {
      const result = await managePost(id, action);
      setCurrent(result.status);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not update that post.");
    } finally {
      setPending(false);
    }
  }

  if (current === "REMOVED") return <p className="mt-4 text-sm text-muted">This post was deleted.</p>;

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {current === "FILLED" ? (
        <button type="button" disabled={pending} className="rounded-full bg-zinc-100 px-3 py-1.5 text-sm font-semibold disabled:opacity-60" onClick={() => void act("reopen")}>
          Start hiring again
        </button>
      ) : (
        <button type="button" disabled={pending} className="rounded-full bg-zinc-100 px-3 py-1.5 text-sm font-semibold disabled:opacity-60" onClick={() => void act("stop")}>
          Stop hiring
        </button>
      )}
      <button type="button" disabled={pending} className="rounded-full px-3 py-1.5 text-sm font-semibold text-[#e11d48] disabled:opacity-60" onClick={() => void act("delete")}>
        Delete
      </button>
      {error ? <p className="w-full text-sm text-[#e11d48]">{error}</p> : null}
    </div>
  );
}

export function MyPosts({
  onOpen,
  onChanged,
}: {
  onOpen: (post: MyPost) => void;
  onChanged: () => void;
}) {
  const [posts, setPosts] = useState<MyPost[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  function load() {
    return listMyPosts()
      .then((result) => {
        setPosts(result.leads);
        setError(null);
      })
      .catch((caught: unknown) => {
        setError(caught instanceof ApiError ? caught.message : "Could not load your posts.");
      });
  }

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(handle);
  }, []);

  async function act(id: string, action: "stop" | "delete" | "reopen") {
    setPendingId(id);
    setError(null);
    try {
      await managePost(id, action);
      await load();
      onChanged();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not update that post.");
    } finally {
      setPendingId(null);
    }
  }

  if (error && posts.length === 0) return <p className="text-sm text-[#e11d48]">{error}</p>;

  if (posts.length === 0) {
    return <p className="rounded-2xl border border-dashed border-line p-4 text-sm text-muted">No business posts yet. Post a job for a place you run.</p>;
  }

  return (
    <div className="space-y-3">
      {error ? <p className="text-sm text-[#e11d48]">{error}</p> : null}
      {posts.map((post) => {
        const stopped = post.status === "FILLED";
        const busy = pendingId === post.id;
        return (
          <article key={post.id} className="rounded-2xl border border-line p-3">
            <h3 className="font-semibold">{post.businessName}</h3>
            <p className="text-sm text-muted">
              {post.area} · {stopped ? "Hiring stopped" : "Hiring"}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="rounded-full bg-zinc-100 px-3 py-1.5 text-sm font-semibold" onClick={() => onOpen(post)}>
                View
              </button>
              {stopped ? (
                <button type="button" disabled={busy} className="rounded-full bg-zinc-100 px-3 py-1.5 text-sm font-semibold disabled:opacity-60" onClick={() => void act(post.id, "reopen")}>
                  Start hiring again
                </button>
              ) : (
                <button type="button" disabled={busy} className="rounded-full bg-zinc-100 px-3 py-1.5 text-sm font-semibold disabled:opacity-60" onClick={() => void act(post.id, "stop")}>
                  Stop hiring
                </button>
              )}
              <button type="button" disabled={busy} className="rounded-full px-3 py-1.5 text-sm font-semibold text-[#e11d48] disabled:opacity-60" onClick={() => void act(post.id, "delete")}>
                Delete
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
