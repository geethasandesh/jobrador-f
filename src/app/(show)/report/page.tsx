import { redirect } from "next/navigation";

export default function ReportPage() {
  redirect("/map?panel=report");
}
