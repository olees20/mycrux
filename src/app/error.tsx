"use client";
import { ErrorState } from "@/components/ui/error-state";

export default function ApplicationError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="grid min-h-[60vh] place-items-center p-5" id="main-content"><ErrorState description="Your data may not have been saved. Try the action once more; if it keeps failing, contact support." reference={error.digest} reset={reset} title="Something went wrong"/></main>;
}
