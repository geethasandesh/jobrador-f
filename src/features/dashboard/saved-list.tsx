"use client";

import Link from "next/link";
import { useClientReady, useSavedItems } from "@/lib/local-lists";

function hrefFor(kind: string, id: string) {
  if (kind === "nearby_business") return `/businesses/${id}`;
  if (kind === "community_lead") return `/leads/${id}`;
  return `/jobs/${id}`;
}

export function SavedList() {
  const ready = useClientReady();
  const items = useSavedItems();

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10">
      <h1 className="text-4xl font-black tracking-tight">Saved</h1>
      <p className="mt-2 text-sm text-muted">Saved on your account.</p>
      {!ready || items.length === 0 ? (
        <p className="mt-8 text-sm text-muted">Nothing saved yet.</p>
      ) : (
        <ul className="mt-8 space-y-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-2xl border border-line px-4 py-3">
              <Link href={hrefFor(item.kind, item.id)} className="font-semibold">
                {item.kind === "nearby_business" ? "Open saved place" : "Open saved job"}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
