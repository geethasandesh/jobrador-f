export function SampleBanner({ dataSource }: { dataSource?: "mock" | "live" }) {
  if (dataSource === "live") return null;
  return (
    <p className="rounded-full bg-[#fff1f2] px-3 py-1 text-xs font-medium text-[#e11d48]">
      Sample data · not live vacancies
    </p>
  );
}
