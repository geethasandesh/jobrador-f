"use client";

import Link from "next/link";
import { useClientReady, useRoute, useSavedJobs } from "@/lib/local-lists";
import { useSession } from "@/lib/session";

export function DashboardOverview() {
  const ready = useClientReady();
  const session = useSession();
  const saved = useSavedJobs().length;
  const visits = useRoute().length;

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10">
      <p className="text-sm text-muted">{session?.email}</p>
      <h1 className="mt-2 text-4xl font-black tracking-tight">Dashboard</h1>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <Link href="/dashboard/saved" className="rounded-3xl border border-line p-5">
          <p className="text-sm text-muted">Saved jobs</p>
          <p className="mt-2 text-3xl font-black">{ready ? saved : "–"}</p>
        </Link>
        <Link href="/dashboard/visits" className="rounded-3xl border border-line p-5">
          <p className="text-sm text-muted">Visit list</p>
          <p className="mt-2 text-3xl font-black">{ready ? visits : "–"}</p>
        </Link>
      </div>
      <Link href="/map" className="mt-6 inline-flex rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">
        Open the map
      </Link>
    </main>
  );
}
