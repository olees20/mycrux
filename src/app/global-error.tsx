"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <html lang="en"><body><main style={{ fontFamily: "Arial, sans-serif", margin: "4rem auto", maxWidth: "36rem", padding: "1rem", textAlign: "center" }}><h1>Crux is temporarily unavailable</h1><p>Retry in a moment. If the problem continues, contact support and include the time it occurred.</p><button onClick={reset} style={{ background: "#111", border: 0, borderRadius: "999px", color: "white", minHeight: "44px", padding: "0 1.25rem" }} type="button">Try again</button></main></body></html>;
}
