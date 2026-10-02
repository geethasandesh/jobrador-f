import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <h1 className="font-serif text-4xl">That page is not on the map</h1>
      <p className="mt-3 text-muted">The listing may have been removed, or the link is wrong.</p>
      <Link href="/map" className="mt-6 inline-flex rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white">
        Back to the map
      </Link>
    </main>
  );
}
