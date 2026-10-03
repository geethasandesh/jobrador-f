"use client";

import { useState } from "react";

const marker = `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 100" preserveAspectRatio="none"><defs><linearGradient id="ink" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f08a3a"/><stop offset="0.06" stop-color="#ffb066"/><stop offset="0.2" stop-color="#ffc48a"/><stop offset="0.5" stop-color="#ffe0c2"/><stop offset="0.8" stop-color="#ffc48a"/><stop offset="0.94" stop-color="#ffb066"/><stop offset="1" stop-color="#f08a3a"/></linearGradient><filter id="felt" x="-2%" y="-12%" width="104%" height="124%"><feGaussianBlur stdDeviation="0.5 1.15"/></filter></defs><path filter="url(#felt)" fill="url(#ink)" d="M18 50C6 24 16 6 54 16C110 24 190 30 400 28C610 26 700 22 746 14C784 6 796 22 788 50C796 78 784 94 746 86C700 78 610 74 400 72C190 70 110 76 54 84C16 94 6 76 18 50Z"/></svg>`)}")`;

const quotes = [
  {
    text: "If the job is on your street, a listing page will bury it. jobrador puts the door on the map, with the distance, so you can walk over and ask.",
    name: "jobrador",
    role: "Student jobs, on a map",
  },
  {
    text: "A green pin is a posting we can open. A yellow pin means no public vacancy found. You can still visit and ask.",
    name: "jobrador",
    role: "Honest pins",
  },
];

export function HighlightQuote() {
  const [index, setIndex] = useState(0);
  const quote = quotes[index] ?? quotes[0];

  return (
    <section className="mx-auto w-full max-w-3xl px-6 pb-16 pt-4 sm:px-10">
      <blockquote className="text-[1.35rem] font-bold leading-[2.15] tracking-[-0.035em] text-ink sm:text-[1.85rem]">
        <span
          className="px-[0.4em] py-[0.28em] [box-decoration-break:clone] [-webkit-box-decoration-break:clone]"
          style={{
            backgroundImage: marker,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
            backgroundSize: "100% 100%",
          }}
        >
          {quote.text}
        </span>
      </blockquote>
      <footer className="mt-8 flex items-center gap-3">
        <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white" aria-hidden>
          <span className="absolute left-2.5 top-2.5 h-[18px] w-[18px] rounded-full border-[2.5px] border-ink" />
          <span className="absolute bottom-2.5 right-2.5 h-[18px] w-[18px] rounded-full border-[2.5px] border-ink" />
        </span>
        <span>
          <span className="block text-[15px] font-semibold leading-tight text-ink">{quote.name}</span>
          <span className="mt-0.5 block text-sm text-[#5e5e5e]">{quote.role}</span>
        </span>
      </footer>
      <div className="mt-10 flex items-center gap-3">
        <span className="h-px w-16 bg-[#e6e6e6] sm:w-24" />
        {quotes.map((item, itemIndex) => (
          <button
            key={item.role}
            type="button"
            aria-label={`Quote ${itemIndex + 1}`}
            aria-current={itemIndex === index ? "true" : undefined}
            onClick={() => setIndex(itemIndex)}
            className={`h-2 w-2 rounded-full ${itemIndex === index ? "bg-ink" : "bg-[#b0b0b0]"}`}
          />
        ))}
        <span className="h-px flex-1 bg-[#e6e6e6]" />
      </div>
    </section>
  );
}
