"use client";
import { ErrorState } from "@/components/ui/error-state";

export default function FloorplanError({ reset }: { error: Error; reset: () => void }) {
  return <ErrorState description="Your saved layout has not been changed. Try loading the editor again." reset={reset} title="The floorplan could not be loaded"/>;
}
