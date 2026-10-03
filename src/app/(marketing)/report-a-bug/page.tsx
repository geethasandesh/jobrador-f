import type { Metadata } from "next";
import { BugReportForm } from "@/features/feedback/bug-report-form";
import { LegalPage } from "@/features/legal/legal-page";

export const metadata: Metadata = {
  title: "Report a bug · jobrador",
};

export default function BugReportPage() {
  return (
    <LegalPage
      title="Report a bug"
      lede="Tell us what broke. The note is emailed to the people who run this project. It is not saved with the jobs."
    >
      <BugReportForm />
    </LegalPage>
  );
}
