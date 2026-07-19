"use client";

import { Button } from "@/components/ui/button";

export default function GymSetupError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="mx-auto max-w-2xl rounded-3xl border border-red-200 bg-red-50 p-8" role="alert"><p className="text-sm font-bold uppercase tracking-[0.2em] text-red-800">Setup unavailable</p><h1 className="mt-2 text-3xl font-black text-red-950">We could not load your saved progress</h1><p className="mt-3 text-red-900">Your existing gym data has not been changed. Try loading this step again.</p><Button className="mt-5" onClick={reset}>Try again</Button></div>;
}
