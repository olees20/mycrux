import { Select } from "@/components/ui/form-controls";
import Link from "next/link";
import { saveLeaderboardPreferenceAction } from "@/features/leaderboards/actions";
import { dateInTimezone } from "@/features/home/data-core";
import { requireActiveGymContext } from "@/lib/server/gym-context";
import { createServerComponentSupabaseClient } from "@/lib/supabase/server";
const categories = ["monthly_sends", "challenge_points", "streaks"] as const;
type Search = { category?: string; month?: string };
export default async function LeaderboardsPage({
  params,
  searchParams,
}: {
  params: Promise<{ gymSlug: string }>;
  searchParams: Promise<Search>;
}) {
  const [{ gymSlug }, search] = await Promise.all([params, searchParams]);
  const { gym } = await requireActiveGymContext({ gymSlug });
  const supabase = await createServerComponentSupabaseClient();
  const [
    {
      data: { user },
    },
    { data: settings },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("gyms").select("timezone").eq("id", gym.id).single(),
  ]);
  const currentMonth = `${dateInTimezone(new Date(), settings?.timezone ?? "Europe/London").slice(0, 7)}-01`,
    category = categories.includes(
      search.category as (typeof categories)[number],
    )
      ? (search.category as (typeof categories)[number])
      : "monthly_sends",
    month = /^\d{4}-\d{2}-01$/.test(search.month ?? "")
      ? (search.month as string)
      : currentMonth;
  const [{ data: preference }, { data: community }, { data: competitions }] =
    await Promise.all([
      supabase
        .from("leaderboard_preferences")
        .select("opted_in,display_name_mode")
        .eq("gym_id", gym.id)
        .eq("profile_id", user?.id ?? "")
        .maybeSingle(),
      supabase.rpc("get_community_leaderboard", {
        target_gym_id: gym.id,
        category,
        window_month: month,
      }),
      supabase
        .from("competitions")
        .select("id,name,status,starts_at,ends_at")
        .eq("gym_id", gym.id)
        .in("status", ["registration", "live", "complete"])
        .order("starts_at", { ascending: false })
        .limit(10),
    ]);
  const competitionIds = (competitions ?? []).map((competition) => competition.id);
  const { data: allScores } = competitionIds.length ? await supabase.from("competition_leaderboard").select("competition_id,profile_id,guest_invite_id,total_score,tops,zones,attempts,rank").eq("gym_id", gym.id).in("competition_id", competitionIds).order("rank").limit(200) : { data: [] };
  const competitionRows = (competitions ?? []).map((competition) => ({ ...competition, rows: (allScores ?? []).filter((row) => row.competition_id === competition.id).slice(0, 20) }));
  const profileIds = [
      ...new Set(
        competitionRows.flatMap((item) =>
          item.rows.flatMap((row) => (row.profile_id ? [row.profile_id] : [])),
        ),
      ),
    ],
    { data: profiles } = profileIds.length
      ? await supabase
          .from("profiles")
          .select("id,display_name")
          .in("id", profileIds)
      : { data: [] },
    names = new Map(
      (profiles ?? []).map((item) => [item.id, item.display_name]),
    );
  const base = `/g/${gym.slug}/app/leaderboards`;
  return (
    <div className="mx-auto max-w-5xl">
      <p className="app-eyebrow text-[var(--muted)]">
        Friendly competition
      </p>
      <h1 className="mt-2 text-4xl font-extrabold tracking-[-.035em]">Gym leaderboards</h1>
      <p className="mt-2 max-w-3xl text-sm text-[var(--muted)]">
        Community rankings are optional and never use age, gender, weight,
        disability or other sensitive traits. Formal competition results follow
        their published rules and do not require community opt-in.
      </p>
      <section className="mt-7 rounded-[var(--radius-lg)] border bg-[var(--surface)] p-5">
        <h2 className="text-xl font-black">Community privacy</h2>
        <form
          action={saveLeaderboardPreferenceAction}
          className="mt-4 grid gap-3 sm:grid-cols-3"
        >
          <input name="gymSlug" type="hidden" value={gym.slug} />
          <label className="text-sm font-bold">
            Participate
            <Select
              className="mt-1 w-full rounded-[var(--radius-sm)] border p-3 font-normal"
              defaultValue={preference?.opted_in ? "yes" : "no"}
              name="participate"
            >
              <option value="no">No — keep me out</option>
              <option value="yes">Yes — opt me in</option>
            </Select>
          </label>
          <label className="text-sm font-bold">
            Display name
            <Select
              className="mt-1 w-full rounded-[var(--radius-sm)] border p-3 font-normal"
              defaultValue={preference?.display_name_mode ?? "anonymous"}
              name="nameMode"
            >
              <option value="anonymous">Anonymous climber code</option>
              <option value="name">My display name</option>
            </Select>
          </label>
          <button className="min-h-12 self-end rounded-[var(--radius-md)] bg-[var(--primary)] px-5 font-bold text-white">
            Save privacy choice
          </button>
        </form>
      </section>
      <section className="mt-7 rounded-[var(--radius-lg)] border bg-[var(--surface)] p-5">
        <div className="flex flex-wrap gap-2">
          {categories.map((value) => (
            <Link
              className={`rounded-full px-4 py-2 text-sm font-bold ${category === value ? "bg-[var(--primary)] text-white" : "border"}`}
              href={`${base}?category=${value}&month=${month}`}
              key={value}
            >
              {value.replaceAll("_", " ")}
            </Link>
          ))}
        </div>
        <form className="mt-4 flex flex-wrap items-end gap-3">
          <input name="category" type="hidden" value={category} />
          <label className="text-sm font-bold">
            Month
            <input
              className="mt-1 block rounded-[var(--radius-sm)] border p-3 font-normal"
              defaultValue={month.slice(0, 7)}
              name="monthPicker"
              type="month"
            />
          </label>
          <input name="month" type="hidden" value={month} />
          <button className="min-h-12 rounded-[var(--radius-md)] border px-5 font-bold">
            View month
          </button>
        </form>
        <h2 className="mt-6 text-xl font-black">
          {category.replaceAll("_", " ")}
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {category === "monthly_sends"
            ? "One send per route per day; at most 20 routes score. Ties: earliest scoring send, then stable member ID."
            : category === "challenge_points"
              ? "10 points per unique scoring route plus 2 for a flash; at most 20 routes score. Same tie rule."
              : "Longest consecutive Monday-to-Sunday session-week run in the 12-week lookback. Ties: earliest streak, then stable member ID."}
        </p>
        <ol className="mt-5 space-y-2">
          {(community ?? []).map((row) => (
            <li
              className="flex items-center justify-between rounded-[var(--radius-md)] bg-[var(--surface-subtle)] p-4"
              key={row.profile_id}
            >
              <span>
                <strong className="mr-3">{row.rank}</strong>
                {row.display_name}
              </span>
              <strong>{row.score}</strong>
            </li>
          ))}
        </ol>
        {community?.length ? null : (
          <p className="mt-5 text-sm text-[var(--muted)]">
            No opted-in members have a score in this window.
          </p>
        )}
      </section>
      <section className="mt-7">
        <h2 className="text-2xl font-black">Formal competitions</h2>
        <div className="mt-4 space-y-5">
          {competitionRows.map((item) => (
            <article className="rounded-[var(--radius-lg)] border bg-[var(--surface)] p-5" key={item.id}>
              <h3 className="text-xl font-black">{item.name}</h3>
              <p className="text-sm text-[var(--muted)]">
                Score descending, then tops descending, then fewer attempts.
                Exact scoring comes from the competition rules.
              </p>
              <ol className="mt-4 space-y-2">
                {item.rows.map((row, index) => (
                  <li
                    className="flex justify-between rounded-[var(--radius-sm)] bg-[var(--surface-subtle)] p-3 text-sm"
                    key={`${row.profile_id}-${row.guest_invite_id}-${index}`}
                  >
                    <span>
                      <strong className="mr-2">{row.rank}</strong>
                      {row.profile_id
                        ? (names.get(row.profile_id) ?? "Climber")
                        : "Guest climber"}
                    </span>
                    <span className="font-bold">{row.total_score}</span>
                  </li>
                ))}
              </ol>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
