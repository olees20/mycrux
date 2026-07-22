"use client";
import { ErrorState } from "@/components/ui/error-state";

export default function GymHomeError({ reset }: { error: Error; reset: () => void }) {
  return <ErrorState description="Your account is still safe. Try loading the gym data again." reset={reset} title="The gym home could not be loaded"/>;
}
