import { Select } from "@/components/ui/form-controls";
import { switchGymAction } from "@/features/gyms/actions";
import type { AccessibleGym } from "@/lib/server/gym-context-core";

export function GymSwitcher({
  activeGym,
  gyms,
  destination = "/app",
}: Readonly<{
  activeGym: AccessibleGym;
  gyms: readonly AccessibleGym[];
  destination?: "/app" | "/staff";
}>) {
  if (gyms.length < 2) return <p className="mt-3 text-sm font-semibold text-[var(--muted)]">{activeGym.name}</p>;

  return (
    <form action={switchGymAction} className="mt-3 flex items-center gap-2">
      <label className="sr-only" htmlFor="active-gym">Active gym</label>
      <Select className="min-h-10 min-w-0 flex-1 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-2 text-sm font-semibold" defaultValue={activeGym.slug} id="active-gym" name="gymSlug">
        {gyms.map((gym) => <option key={gym.id} value={gym.slug}>{gym.name}</option>)}
      </Select>
      <input name="destination" type="hidden" value={destination} />
      <button className="min-h-10 rounded-[var(--radius-sm)] bg-[var(--accent)] px-3 text-xs font-bold" type="submit">Switch</button>
    </form>
  );
}
