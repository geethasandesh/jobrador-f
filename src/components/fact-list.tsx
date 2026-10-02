export function FactList({ rows }: { rows: Array<{ label: string; value: string | null }> }) {
  return (
    <dl className="mt-6 divide-y divide-line rounded-2xl border border-line bg-card">
      {rows.map((row) => (
        <div key={row.label} className="grid gap-1 px-4 py-3 sm:grid-cols-[140px_1fr] sm:gap-4">
          <dt className="text-sm text-muted">{row.label}</dt>
          <dd className="text-sm font-medium text-ink">{row.value ?? "Not listed"}</dd>
        </div>
      ))}
    </dl>
  );
}
