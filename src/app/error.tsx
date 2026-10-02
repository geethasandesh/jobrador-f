"use client";

export default function AppError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <h1 className="font-serif text-4xl">The map service did not respond</h1>
      <p className="mt-3 text-muted">{error.message}</p>
      <button type="button" onClick={reset} className="mt-6 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">
        Try again
      </button>
    </main>
  );
}
