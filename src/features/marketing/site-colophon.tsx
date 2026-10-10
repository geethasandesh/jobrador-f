import { LegalLinks } from "@/features/legal/legal-links";

export function SiteColophon() {
  return (
    <section className="bg-transparent px-6 pb-16 pt-14 text-center sm:pb-20 sm:pt-16">
      <div className="mx-auto h-px w-12 bg-ink/25" />
      <div className="mx-auto mt-8 max-w-2xl space-y-2.5 text-[0.95rem] leading-relaxed text-[#3a3a3a] sm:text-base">
        <p>P.S.#1: No AI was hurt while making this platform.</p>
        <p>P.S.#2: Do it with all your heart, or don&apos;t do it at all. ✨</p>
        <p>
          P.S.#3: Wireframed, designed, prototyped, and hand-coded by{" "}
          <a
            href="https://www.grahmind.com/"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-ink underline decoration-ink underline-offset-[3px]"
          >
            Grahmind Innovations
          </a>{" "}
          with extreme love, care, and passion for crafting students will love to use.
        </p>
      </div>
      <div className="mt-9">
        <LegalLinks />
      </div>
    </section>
  );
}
