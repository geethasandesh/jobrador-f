export function HowToDialog({
  onClose,
  onPostJob,
}: {
  onClose: () => void;
  onPostJob: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[950] grid place-items-center bg-[#0e1a2b]/45 px-3 py-4">
      <div
        role="dialog"
        aria-labelledby="how-to-title"
        className="max-h-[min(100dvh-1.5rem,780px)] w-full max-w-[560px] overflow-y-auto rounded-[32px] bg-[linear-gradient(180deg,#cfe6ff_0%,#f3f8ff_28%,#ffffff_58%)] p-5 shadow-[0_30px_80px_rgba(8,20,40,0.35)] sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#f5a3a3]/80 bg-white/70 px-3 py-1 text-xs font-semibold text-[#e10600]">
            <span className="relative block h-3.5 w-3.5" aria-hidden>
              <span className="absolute left-0 top-0 h-2 w-2 rounded-full border-[1.5px] border-current" />
              <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full border-[1.5px] border-current" />
            </span>
            Beta · Berlin only
          </span>
          <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full bg-white/80 text-lg leading-none text-ink" aria-label="Close">
            ×
          </button>
        </div>

        <h2 id="how-to-title" className="mt-4 text-center text-3xl font-black leading-none tracking-[-0.045em] text-ink">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#e7f0ff] px-3 py-1 align-middle text-[0.72em] text-[#3b82f6]">
            <BriefcaseIcon />
            job
          </span>{" "}
          <span className="inline-flex items-center gap-1 rounded-full bg-[#fff1e6] px-3 py-1 align-middle text-[0.72em] text-[#ff7a1a]">
            <MapIcon />
            map
          </span>
        </h2>

        <div className="mx-auto mt-5 flex max-w-sm flex-col items-center gap-2">
          <div className="flex w-full items-center gap-2 rounded-full border border-line bg-white px-3 py-2 text-sm shadow-sm">
            <SearchIcon />
            <span>Adenauerplatz</span>
          </div>
          <Arrow />
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white py-1 pr-3 pl-1 text-sm font-semibold shadow-sm">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-[#22c55e] text-white">
                <BriefcaseIcon />
              </span>
              Job
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white py-1 pr-3 pl-1 text-sm font-semibold shadow-sm">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-[#3b82f6] text-white">
                <FlagIcon />
              </span>
              Tip
            </span>
          </div>
          <Arrow />
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="rounded-full bg-ink px-3 py-1.5 text-sm font-semibold text-white">View details</span>
            <Arrow flat />
            <span className="rounded-full bg-ink px-3 py-1.5 text-sm font-semibold text-white">Apply</span>
          </div>
          <Arrow />
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="rounded-full bg-ink px-3 py-1.5 text-sm font-semibold text-white">Save job</span>
            <Arrow flat />
            <span className="rounded-full border border-line bg-white px-3 py-1.5 text-sm font-semibold">Saved</span>
          </div>
          <Arrow />
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="rounded-full border border-line bg-white px-3 py-1.5 text-sm font-semibold">Add to route</span>
            <span className="inline-flex items-center gap-1 text-xs font-bold">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-ink text-white">1</span>
              <span className="grid h-5 w-5 place-items-center rounded-full bg-ink text-white">2</span>
              <span className="grid h-5 w-5 place-items-center rounded-full bg-ink text-white">3</span>
            </span>
            <span className="rounded-full border border-line bg-white px-3 py-1.5 text-sm font-semibold">Visit list</span>
          </div>
          <Arrow />
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="rounded-full bg-[#e7f0ff] px-3 py-1.5 text-sm font-semibold text-[#3b82f6]">Share a tip</span>
            <span className="rounded-full bg-[#fff1e6] px-3 py-1.5 text-sm font-semibold text-[#ff7a1a]">Post a job</span>
          </div>
          <Arrow />
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold shadow-sm">Stop hiring</span>
            <span className="rounded-full bg-[#fff1f2] px-3 py-1.5 text-sm font-semibold text-[#e11d48]">Delete</span>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" onClick={onClose} className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white">
            Got it
          </button>
          <button type="button" onClick={onPostJob} className="rounded-full border border-line bg-white px-5 py-2.5 text-sm font-semibold">
            Post a job
          </button>
        </div>
      </div>
    </div>
  );
}

function Arrow({ flat = false }: { flat?: boolean }) {
  return (
    <span className={`text-lg leading-none text-[#8aa0b8] ${flat ? "px-0.5" : ""}`} aria-hidden>
      {flat ? "→" : "↓"}
    </span>
  );
}

function BriefcaseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="2" y="5.2" width="12" height="8" rx="1.6" stroke="currentColor" strokeWidth="1.4" />
      <path d="M6 5.2V4.1A1.1 1.1 0 0 1 7.1 3h1.8A1.1 1.1 0 0 1 10 4.1v1.1" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M6 2.5 2.5 4v9.5L6 12l4 1.5 3.5-1.5V3.5L10 5 6 2.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M6 2.5V12M10 5v8.5" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden className="text-muted">
      <circle cx="7" cy="7" r="4.2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10.4 10.4 13 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function FlagIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M4 2.6v11M4 3.2h7.4L9.4 6.1l2 2.9H4" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}
