"use client";

export default function GymHomeError({ reset }: { error: Error; reset: () => void }) {
  return <div className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-red-50 p-6"><h1 className="text-2xl font-black text-red-900">The gym home could not be loaded</h1><p className="mt-2 text-sm leading-6 text-red-800">Your account is still safe. Try loading the tenant data again.</p><button className="mt-5 min-h-11 rounded-full bg-red-900 px-5 text-sm font-bold text-white" onClick={reset}>Try again</button></div>;
}
