import { Button } from "@/components/ui/button";

export function GymCodeEntry() {
  return (
    <form action="/join" className="mt-5" method="get">
      <label className="block text-sm font-bold" htmlFor="gym-code">Gym code</label>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
        <input
          autoCapitalize="characters"
          autoComplete="off"
          className="min-h-12 min-w-0 flex-1 rounded-xl border border-[var(--border)] px-4 font-mono text-lg uppercase tracking-[0.18em]"
          id="gym-code"
          maxLength={9}
          name="code"
          pattern="[A-Za-z2-9-]{8,9}"
          placeholder="ABCD-EFGH"
          required
          spellCheck={false}
        />
        <Button type="submit">Find gym</Button>
      </div>
      <p className="mt-2 text-xs leading-5 text-[var(--muted)]">Eight letters or numbers. Spaces, case, and the optional dash do not matter.</p>
    </form>
  );
}
