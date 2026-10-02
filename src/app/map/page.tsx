import { Suspense } from "react";
import { ExploreScreen } from "@/features/explore/explore-screen";

export default function MapPage() {
  return (
    <Suspense fallback={<p className="px-4 py-8 text-sm text-muted">Opening the map…</p>}>
      <ExploreScreen />
    </Suspense>
  );
}
