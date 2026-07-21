"use client";

export default function FloorplanError({ reset }: { error: Error; reset: () => void }) {
  return <div className="mx-auto max-w-2xl rounded-3xl border border-red-200 bg-red-50 p-8"><h1 className="text-3xl font-black text-red-950">The floorplan could not be loaded</h1><p className="mt-3 text-sm text-red-900">Your saved layout has not been changed. Try loading the editor again.</p><button className="mt-5 min-h-11 rounded-full bg-red-950 px-5 font-bold text-white focus:outline-none focus:ring-2 focus:ring-red-700 focus:ring-offset-2" onClick={reset}>Try again</button></div>;
}
