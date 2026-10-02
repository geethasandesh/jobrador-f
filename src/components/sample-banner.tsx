export function SampleBanner({ dataSource }: { dataSource?: "mock" | "live" }) {
  if (dataSource === "live") return null;
  return (
    <p className="rounded-xl bg-place-soft px-3 py-2 text-sm text-place">
      Sample data for Berlin. These are not live vacancies.
    </p>
  );
}
