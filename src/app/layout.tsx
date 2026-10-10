import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { LibrarySync } from "@/features/show/library-sync";
import { PageRestore } from "@/features/show/page-restore";
import { ReferralDock } from "@/features/show/referrals/referral-chat";
import "./globals.css";

const inter = Inter({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "jobrador",
  description: "Find student jobs, Minijobs, and local hiring leads near you in Germany.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-white font-sans text-ink">
        {children}
        <LibrarySync />
        <PageRestore />
        <Suspense fallback={null}>
          <ReferralDock />
        </Suspense>
        <Analytics />
      </body>
    </html>
  );
}
