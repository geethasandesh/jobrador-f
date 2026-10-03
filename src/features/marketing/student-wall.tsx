"use client";

import { Caveat } from "next/font/google";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { ApiError, getMyWallNote, getWallNotes, reactToWallNote, stickWallNote, type WallNote } from "@/lib/api/client";

const handwriting = Caveat({
  weight: "600",
  subsets: ["latin"],
});

const COLORS = ["#c6f56e", "#ff8ad4", "#6eb8f5", "#ffb56b", "#ffe56a", "#e2b0f6", "#8ee0cf"];
const DEVICE_KEY = "jobrador.wall-device";
const EMPTY_REACTIONS: WallNote["reactions"] = [
  { emoji: "❤️", count: 0, mine: false },
  { emoji: "😄", count: 0, mine: false },
  { emoji: "🔥", count: 0, mine: false },
  { emoji: "👏", count: 0, mine: false },
];

const WallContext = createContext<{
  reactionsFor: (id: string) => WallNote["reactions"];
  react: (id: string, emoji: string) => void;
} | null>(null);

type Draft = { displayName: string; body: string; color: string };

function deviceId() {
  const existing = localStorage.getItem(DEVICE_KEY);
  if (existing) return existing;
  const created = crypto.randomUUID();
  localStorage.setItem(DEVICE_KEY, created);
  return created;
}

export function StudentWall({ children }: { children: ReactNode }) {
  const [featured, setFeatured] = useState<WallNote[]>([]);
  const [examples, setExamples] = useState<Record<string, WallNote["reactions"]>>({});
  const [mine, setMine] = useState<WallNote | null>(null);
  const [draft, setDraft] = useState<Draft>({ displayName: "", body: "", color: COLORS[0] ?? "#c6f56e" });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const id = deviceId();
    let cancelled = false;
    function loadNotes() {
      getWallNotes(id)
        .then((result) => {
          if (cancelled) return;
          setFeatured(result.notes.filter((note) => !note.id.startsWith("wall_ex_")));
          setExamples(
            Object.fromEntries(
              result.notes.filter((note) => note.id.startsWith("wall_ex_")).map((note) => [note.id, note.reactions]),
            ),
          );
        })
        .catch(() => {
          if (!cancelled) setFeatured([]);
        })
        .finally(() => {
          if (!cancelled) setLoaded(true);
        });
    }
    loadNotes();
    getMyWallNote(id)
      .then((result) => {
        if (!cancelled) setMine(result.note);
      })
      .catch(() => {
        if (!cancelled) setMine(null);
      });
    function onShow() {
      if (document.visibilityState === "visible") loadNotes();
    }
    document.addEventListener("visibilitychange", onShow);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onShow);
    };
  }, []);

  async function stick() {
    setError(null);
    setPending(true);
    try {
      const note = await stickWallNote({ ...draft, deviceId: deviceId() });
      setMine(note);
      setFeatured((current) => [note, ...current.filter((item) => item.id !== note.id && !item.id.startsWith("wall_ex_"))]);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "The note could not be stuck.");
    } finally {
      setPending(false);
    }
  }

  const showPad = !mine && loaded;

  function applyReactions(noteId: string, reactions: WallNote["reactions"]) {
    if (noteId.startsWith("wall_ex_")) {
      setExamples((current) => ({ ...current, [noteId]: reactions }));
      return;
    }
    setFeatured((current) => current.map((note) => (note.id === noteId ? { ...note, reactions } : note)));
  }

  async function react(noteId: string, emoji: string) {
    try {
      const result = await reactToWallNote(noteId, { deviceId: deviceId(), emoji });
      applyReactions(noteId, result.reactions);
    } catch {
      return;
    }
  }

  return (
    <WallContext.Provider value={{ reactionsFor: (id) => examples[id] ?? EMPTY_REACTIONS, react }}>
    <div id="student-wall" className="relative mt-10 w-full scroll-mt-24 overflow-x-clip sm:mt-14">
      {showPad ? (
          <article
            className="relative z-10 mx-4 mb-5 w-auto px-4 pb-4 pt-5 shadow-[0_12px_24px_rgba(20,20,20,0.22)] sm:absolute sm:top-0 sm:right-4 sm:mx-0 sm:mb-0 sm:w-[188px] sm:px-3 sm:pb-3 sm:pt-4"
            style={{ backgroundColor: draft.color }}
          >
            <Tape rotate={-8} />
            <label className="block">
              <span className="sr-only">Your note</span>
              <textarea
                value={draft.body}
                maxLength={160}
                rows={3}
                placeholder="The job was on my street."
                onChange={(event) => setDraft({ ...draft, body: event.target.value })}
                className={`${handwriting.className} w-full resize-none bg-transparent text-[1.15rem] leading-snug text-ink outline-none placeholder:text-ink/40`}
              />
            </label>
            <label className="mt-2 block">
              <span className="sr-only">First name</span>
              <input
                value={draft.displayName}
                maxLength={20}
                placeholder="First name"
                onChange={(event) => setDraft({ ...draft, displayName: event.target.value })}
                className={`${handwriting.className} w-full bg-transparent text-[1.15rem] leading-snug text-ink outline-none placeholder:text-ink/40`}
              />
            </label>
            <div className="mt-3 flex gap-1.5" role="radiogroup" aria-label="Note color">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={color}
                  aria-checked={draft.color === color}
                  role="radio"
                  onClick={() => setDraft({ ...draft, color })}
                  className={`h-3.5 w-3.5 rounded-full border border-black/15 ${draft.color === color ? "ring-2 ring-ink ring-offset-1" : ""}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={stick}
              disabled={pending}
              className="mt-2 w-full rounded-full bg-ink px-2 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
            >
              {pending ? "Sticking…" : "Stick it"}
            </button>
            {error ? <p className="mt-2 text-xs font-medium text-ink">{error}</p> : null}
          </article>
      ) : null}
      <div className={`mx-auto grid w-full max-w-5xl grid-cols-2 gap-3 px-4 sm:grid-cols-4 sm:gap-5 sm:px-6 ${showPad ? "sm:pr-[max(1.5rem,calc(14rem-(100vw-min(100vw,64rem))/2))]" : ""}`}>
        {children}
        {featured.map((note, index) => (
          <StuckNote key={note.id} note={note} tilt={tilt(index + 2)} onReact={applyReactions} />
        ))}
      </div>
    </div>
    </WallContext.Provider>
  );
}

export function ExampleSticky({
  id,
  color,
  rotate,
  tape,
  parts,
}: {
  id: string;
  color: string;
  rotate: number;
  tape: number;
  parts: { text: string; strike?: boolean }[];
}) {
  const wall = useContext(WallContext);
  return (
    <article
      className="relative flex h-full w-full flex-col px-4 pb-3 pt-5 shadow-[0_14px_22px_rgba(20,20,20,0.14)]"
      style={{ backgroundColor: color, transform: `rotate(${rotate}deg)` }}
    >
      <Tape rotate={tape} />
      <p className={`${handwriting.className} text-[1.25rem] leading-snug text-ink sm:text-[1.4rem]`}>
        {parts.map((part, index) => (
          <span key={index} className={part.strike ? "line-through decoration-[2.5px] decoration-ink" : undefined}>
            {part.text}
          </span>
        ))}
      </p>
      <ReactionRow
        reactions={wall?.reactionsFor(id) ?? EMPTY_REACTIONS}
        onReact={(emoji) => wall?.react(id, emoji)}
      />
    </article>
  );
}

function ReactionRow({
  reactions,
  onReact,
  busy = false,
}: {
  reactions: WallNote["reactions"];
  onReact: (emoji: string) => void;
  busy?: boolean;
}) {
  return (
    <div className="mt-auto flex flex-wrap items-end gap-1.5 pt-3 sm:gap-2">
      {reactions.map((reaction) => (
        <button
          key={reaction.emoji}
          type="button"
          aria-label={reaction.emoji}
          aria-pressed={reaction.mine}
          disabled={busy}
          onClick={() => onReact(reaction.emoji)}
          className={`inline-flex items-end gap-0.5 bg-transparent leading-none ${reaction.mine ? "text-[1.85rem]" : "text-[1rem]"}`}
        >
          {reaction.emoji}
          {reaction.count > 0 ? (
            <span className="text-xs font-bold text-ink">{reaction.count}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

function tilt(index: number) {
  return [-6, 4, -2, 5, -4, 3, -3][index % 7] ?? -2;
}

function Tape({ rotate }: { rotate: number }) {
  return (
    <span
      aria-hidden
      className="absolute left-1/2 top-0 h-3.5 w-11 bg-[#ead78a]/90"
      style={{ transform: `translate(-50%, -45%) rotate(${rotate}deg)` }}
    />
  );
}

function StuckNote({
  note,
  tilt: degrees,
  onReact,
}: {
  note: WallNote;
  tilt: number;
  onReact: (noteId: string, reactions: WallNote["reactions"]) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function react(emoji: string) {
    if (busy) return;
    setBusy(true);
    try {
      const result = await reactToWallNote(note.id, { deviceId: deviceId(), emoji });
      onReact(note.id, result.reactions);
    } catch {
      setBusy(false);
      return;
    }
    setBusy(false);
  }

  return (
    <article
      className="relative flex h-full w-full flex-col px-4 pb-3 pt-5 shadow-[0_14px_22px_rgba(20,20,20,0.14)]"
      style={{ backgroundColor: note.color, transform: `rotate(${degrees}deg)` }}
    >
      <Tape rotate={degrees > 0 ? -8 : 7} />
      <p className={`${handwriting.className} text-[1.25rem] leading-snug text-ink sm:text-[1.4rem]`}>{note.body}</p>
      <p className="mt-2 text-sm font-semibold text-ink">{note.displayName}</p>
      <ReactionRow reactions={note.reactions ?? EMPTY_REACTIONS} onReact={react} busy={busy} />
    </article>
  );
}
