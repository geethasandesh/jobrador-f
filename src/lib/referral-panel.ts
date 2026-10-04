import { useSyncExternalStore } from "react";

let open = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function setReferralOpen(next: boolean) {
  if (open === next) return;
  open = next;
  emit();
}

export function toggleReferralPanel() {
  setReferralOpen(!open);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useReferralOpen() {
  return useSyncExternalStore(subscribe, () => open, () => false);
}
