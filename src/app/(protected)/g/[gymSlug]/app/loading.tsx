import { Skeleton } from "@/components/ui/layout";
export default function GymHomeLoading() {
  return <div aria-busy="true" aria-live="polite" className="app-container-wide"><span className="sr-only">Loading the gym map</span><Skeleton className="h-8 w-52"/><Skeleton className="mt-3 h-5 w-full max-w-lg"/><Skeleton className="mt-5 h-[min(68vh,42rem)] w-full rounded-[var(--radius-panel)]"/></div>;
}
