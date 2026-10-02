import { ContainerScroll } from "@/components/ui/container-scroll-animation";
import { LandingMap } from "@/features/marketing/landing-map";

export default function HomePage() {
  return (
    <main>
      <ContainerScroll
        titleComponent={
          <div className="relative">
            <Cat className="absolute -top-16 left-0 hidden sm:block" />
            <h1 className="text-center text-[2.7rem] font-black leading-[0.96] tracking-[-0.045em] text-ink sm:text-7xl">
              <span className="block">
                Finding <span className="text-[#d5d5d5]">your next</span>
              </span>
              <span className="mt-1 block">
                student{" "}
                <span className="mx-1 inline-flex translate-y-[-0.08em] items-center gap-1.5 rounded-full bg-[#e7f0ff] px-3 py-1 align-middle text-[0.62em] font-black text-[#3b82f6]">
                  <BriefcaseIcon />
                  job
                </span>{" "}
                <span className="text-[#d5d5d5]">should be</span>
              </span>
              <span className="mt-1 block">
                <span className="text-[#d5d5d5]">as easy as using a</span>{" "}
                <span className="mx-1 inline-flex translate-y-[-0.08em] items-center gap-1.5 rounded-full bg-[#fff1e6] px-3 py-1 align-middle text-[0.62em] font-black text-[#ff7a1a]">
                  <MapIcon />
                  map
                </span>
              </span>
            </h1>
          </div>
        }
      >
        <LandingMap />
      </ContainerScroll>

      <section className="mx-auto w-full max-w-3xl px-6 pb-24 pt-6 sm:px-10">
        <h2 className="text-[2.4rem] font-black leading-[1.02] tracking-[-0.045em] text-ink sm:text-6xl">
          A new way to discover
          <br />
          cool jobs around you.
        </h2>
        <p className="mt-8 max-w-xl text-xl font-medium leading-snug tracking-[-0.02em] text-ink sm:text-[1.7rem]">
          Unlike traditional way of finding jobs using
          <br className="hidden sm:block" /> a listing page, jobrador puts
          <br className="hidden sm:block" /> all the cool startups hiring on a map.
        </p>
      </section>
    </main>
  );
}

function BriefcaseIcon() {
  return (
    <svg width="0.9em" height="0.9em" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="8" width="18" height="12" rx="2.5" fill="currentColor" />
      <path d="M9 8V6.5A1.5 1.5 0 0 1 10.5 5h3A1.5 1.5 0 0 1 15 6.5V8" stroke="white" strokeWidth="1.6" />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg width="0.9em" height="0.9em" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M9 4.5 3.5 6.2v13.1L9 17.6l6 1.9 5.5-1.7V4.7L15 6.4 9 4.5Zm0 1.8 6 1.9v10.6l-6-1.9V6.3Z" />
    </svg>
  );
}

function Cat({ className }: { className?: string }) {
  return (
    <svg className={className} width="118" height="78" viewBox="0 0 118 78" fill="none" aria-hidden>
      <path d="M18 46c2-16 10-24 22-24 4 0 7 2 10 6 3-4 7-6 12-6 13 0 22 10 24 26 6 1 12 5 14 12 2 8-4 14-14 14H28c-10 0-16-6-16-14 0-6 4-11 10-14Z" fill="#161616" />
      <path d="M28 28 18 8l16 12" fill="#161616" />
      <path d="M62 24 70 6l12 16" fill="#161616" />
      <circle cx="40" cy="42" r="2.2" fill="white" />
      <circle cx="58" cy="42" r="2.2" fill="white" />
      <path d="M46 48c2 2 6 2 8 0" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M22 62c8 2 18 2 28 0" stroke="#2a2a2a" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
