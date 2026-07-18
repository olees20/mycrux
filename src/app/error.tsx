"use client";

export default function ApplicationError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="mx-auto max-w-xl p-6 text-center" id="main-content"><h1 className="text-3xl font-black">Something went wrong</h1><p className="mt-3 text-stone-700">Your data may not have been saved. Try the action once more; if it keeps failing, contact support.</p>{error.digest ? <p className="mt-3 text-xs text-stone-500">Support reference: {error.digest}</p> : null}<button className="mt-6 min-h-11 rounded-full bg-black px-5 font-bold text-white" onClick={reset} type="button">Try again</button></main>;
}
