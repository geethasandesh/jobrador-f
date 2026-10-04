import type { Metadata } from "next";
import { Suspense } from "react";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { LibrarySync } from "@/features/show/library-sync";
import { ReferralDock } from "@/features/show/referrals/referral-chat";
import "./globals.css";

const inter = Inter({
  variable: "--font-outfit",
  subsets: ["latin"],
});

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
        <Suspense fallback={null}>
          <ReferralDock />
        </Suspense>
        <Analytics />
      </body>
    </html>
  );
}
