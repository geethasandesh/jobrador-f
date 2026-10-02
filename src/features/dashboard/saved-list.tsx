"use client";

import Link from "next/link";
import { useClientReady, useSavedJobs } from "@/lib/local-lists";

export function SavedList() {
  const ready = useClientReady();
  const ids = useSavedJobs();

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10">
      <h1 className="text-4xl font-black tracking-tight">Saved</h1>
      <p className="mt-2 text-sm text-muted">Jobs you saved on this device.</p>
      {!ready || ids.length === 0 ? (
        <p className="mt-8 text-sm text-muted">Nothing saved yet.</p>
      ) : (
        <ul className="mt-8 space-y-3">
          {ids.map((id) => (
            <li key={id} className="rounded-2xl border border-line px-4 py-3">
              <Link href={`/jobs/${id}`} className="font-semibold">
                Open saved job
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
