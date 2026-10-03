import Link from "next/link";

const links = [
  { href: "/impressum", label: "Impressum" },
  { href: "/datenschutz", label: "Datenschutzerklärung" },
  { href: "/terms", label: "Terms" },
  { href: "/report-a-bug", label: "Report a bug" },
];

export function LegalLinks({ className = "" }: { className?: string }) {
  return (
    <p className={`flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[0.95rem] text-[#3a3a3a] ${className}`}>
      {links.map((link, index) => (
        <span key={link.href}>
          {index > 0 ? <span aria-hidden>·</span> : null}
          <Link href={link.href} className="underline decoration-ink/40 underline-offset-[3px] hover:text-ink">
            {link.label}
          </Link>
        </span>
      ))}
    </p>
  );
}
