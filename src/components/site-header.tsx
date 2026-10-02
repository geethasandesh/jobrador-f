"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRoute } from "@/lib/local-lists";

const links = [
  { href: "/map", label: "Explore" },
  { href: "/report", label: "Report a lead" },
  { href: "/route", label: "Route" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const stops = useRoute().length;

  return (
    <header className="sticky top-0 z-[900] border-b border-line bg-paper/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold text-ink">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand text-sm text-white">
            M
          </span>
          <span className="hidden sm:inline">Student Job Map</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {links.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            const short = link.href === "/report" ? "Report" : link.label;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-3 py-2 ${active ? "bg-ink text-white" : "text-ink hover:bg-white"}`}
              >
                <span className="sm:hidden">{short}</span>
                <span className="hidden sm:inline">{link.label}</span>
                {link.href === "/route" && stops > 0 ? ` (${stops})` : ""}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
