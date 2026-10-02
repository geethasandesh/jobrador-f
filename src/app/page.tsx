import Link from "next/link";
import { LocationSearch } from "@/features/landing/location-search";

const kinds = [
  {
    title: "Job listing",
    color: "bg-job",
    body: "A vacancy from an identifiable source. You apply on the original website.",
  },
  {
    title: "Community lead",
    color: "bg-lead",
    body: "A student reported a hiring sign or a conversation. It is not a confirmed job until someone checks it.",
  },
  {
    title: "Nearby business",
    color: "bg-[#e0a106]",
    body: "The place exists. No public vacancy was found. You can visit and ask.",
  },
];

export default function HomePage() {
  return (
    <main>
      <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-12 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand">Berlin preview</p>
          <h1 className="mt-3 max-w-xl font-serif text-5xl leading-tight text-ink sm:text-6xl">
            Find student jobs near you.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted">
            Discover Minijobs, Werkstudent jobs, part-time work and local hiring opportunities around Germany.
          </p>
          <LocationSearch />
          <Link href="/report" className="mt-4 inline-flex text-sm font-semibold text-ink underline decoration-line underline-offset-4">
            Report a hiring lead
          </Link>
        </div>
        <div className="relative hidden min-h-[440px] overflow-hidden rounded-[2rem] border border-line bg-[#e7efe4] lg:block">
          <div
            className="absolute inset-0 opacity-70"
            style={{
              backgroundImage: "radial-gradient(#9aab96 1px, transparent 1px)",
              backgroundSize: "22px 22px",
            }}
          />
          <span className="pin pin-job absolute left-[22%] top-[30%] scale-125" />
          <span className="pin pin-lead absolute left-[58%] top-[22%] scale-125" />
          <span className="pin pin-place absolute left-[46%] top-[58%] scale-125" />
          <span className="pin pin-job absolute left-[70%] top-[48%] scale-125" />
          <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-line bg-card p-4 shadow-sm">
            <p className="text-xs font-semibold text-job">Job listing</p>
            <p className="mt-1 font-semibold">Restaurant ABC</p>
            <p className="text-sm text-muted">Service Mitarbeiter · 1.2 km · Minijob · €14/hour</p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 pb-16 md:grid-cols-3">
        {kinds.map((kind) => (
          <article key={kind.title} className="rounded-3xl border border-line bg-card p-5">
            <span className={`pin ${kind.color === "bg-job" ? "pin-job" : kind.color === "bg-lead" ? "pin-lead" : "pin-place"}`} />
            <h2 className="mt-4 font-serif text-2xl">{kind.title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{kind.body}</p>
          </article>
        ))}
      </section>

      <section className="border-t border-line">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 md:grid-cols-3">
          <div>
            <p className="text-sm font-semibold text-brand">1</p>
            <h2 className="mt-2 font-serif text-2xl">Search your area</h2>
            <p className="mt-2 text-sm text-muted">Start from a neighbourhood, a postal area, or your current location.</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-brand">2</p>
            <h2 className="mt-2 font-serif text-2xl">Read what is known</h2>
            <p className="mt-2 text-sm text-muted">A report is labeled as a report. Missing salary stays missing.</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-brand">3</p>
            <h2 className="mt-2 font-serif text-2xl">Apply or visit</h2>
            <p className="mt-2 text-sm text-muted">Open the original listing, or add places to a visit list and go in person.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
