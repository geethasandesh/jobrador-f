export function MapToast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="status"
      className="w-[min(100vw-3rem,440px)] rounded-2xl bg-white px-4 py-3 text-center text-sm font-medium leading-snug text-ink shadow-[0_12px_40px_rgba(17,17,17,0.16)]"
    >
      {message}
    </p>
  );
}
