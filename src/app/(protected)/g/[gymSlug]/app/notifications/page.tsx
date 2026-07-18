import Link from "next/link";
import { PaginationNav } from "@/components/pagination-nav";
import {
  markAllNotificationsReadAction,
  setNotificationReadAction,
  updateNotificationPreferencesAction,
} from "@/features/notifications/actions";
import { requireRouteUser } from "@/lib/server/authorization";
import { requireActiveGymContext } from "@/lib/server/gym-context";
import { createServerComponentSupabaseClient } from "@/lib/supabase/server";
import { parsePage } from "@/lib/pagination";

export default async function NotificationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ gymSlug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const [{ gymSlug }, search] = await Promise.all([params, searchParams]);
  const { gym } = await requireActiveGymContext({ gymSlug });
  const supabase = await createServerComponentSupabaseClient();
  const user = await requireRouteUser(supabase);
  const page = parsePage(search.page),
    pageSize = 30,
    offset = (page - 1) * pageSize;
  const [{ data: notificationRows }, { data: preferences }, { count: unread }] = await Promise.all(
    [
      supabase
        .from("notifications")
        .select("id,notification_type,title,body,link_path,read_at,created_at")
        .eq("gym_id", gym.id)
        .eq("profile_id", user.id)
        .is("archived_at", null)
        .order("created_at", { ascending: false })
        .range(offset, offset + pageSize),
      supabase
        .from("notification_preferences")
        .select(
          "announcements_enabled,events_enabled,community_enabled,chat_enabled,email_enabled,push_enabled,quiet_hours_start,quiet_hours_end",
        )
        .eq("gym_id", gym.id)
        .eq("profile_id", user.id)
        .maybeSingle(),
      supabase.from("notifications").select("id", { count: "exact", head: true }).eq("gym_id", gym.id).eq("profile_id", user.id).is("archived_at", null).is("read_at", null),
    ],
  );
  const hasNext = (notificationRows?.length ?? 0) > pageSize,
    notifications = (notificationRows ?? []).slice(0, pageSize);
  const toggles = [
    [
      "announcementsEnabled",
      "Announcements",
      preferences?.announcements_enabled ?? true,
    ],
    ["eventsEnabled", "Events", preferences?.events_enabled ?? true],
    ["communityEnabled", "Community", preferences?.community_enabled ?? true],
    ["chatEnabled", "Chat", preferences?.chat_enabled ?? true],
    [
      "emailEnabled",
      "Future email delivery",
      preferences?.email_enabled ?? true,
    ],
    ["pushEnabled", "Future push delivery", preferences?.push_enabled ?? true],
  ] as const;
  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--muted)]">
            Inbox
          </p>
          <h1 className="mt-3 text-4xl font-black">Notifications</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">{unread ?? 0} unread</p>
        </div>
        {unread ? (
          <form action={markAllNotificationsReadAction}>
            <input name="gymSlug" type="hidden" value={gym.slug} />
            <button className="min-h-11 rounded-full border border-black/10 px-4 text-sm font-bold">
              Mark all read
            </button>
          </form>
        ) : null}
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <section>
          <ul className="space-y-3">
            {notifications?.map((item) => (
              <li
                className={
                  item.read_at
                    ? "rounded-2xl border border-black/10 bg-[var(--surface)] p-5 opacity-70"
                    : "rounded-2xl border-2 border-[var(--accent)] bg-[var(--surface)] p-5"
                }
                key={item.id}
              >
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                  {item.notification_type}
                </p>
                <h2 className="mt-1 font-black">{item.title}</h2>
                <p className="mt-2 text-sm leading-6">{item.body}</p>
                <div className="mt-3 flex items-center gap-4">
                  {item.link_path ? (
                    <Link
                      className="text-sm font-bold underline"
                      href={item.link_path}
                    >
                      Open
                    </Link>
                  ) : null}
                  <form action={setNotificationReadAction}>
                    <input name="gymSlug" type="hidden" value={gym.slug} />
                    <input
                      name="notificationId"
                      type="hidden"
                      value={item.id}
                    />
                    <input
                      name="read"
                      type="hidden"
                      value={item.read_at ? "false" : "true"}
                    />
                    <button className="text-sm font-bold">
                      Mark {item.read_at ? "unread" : "read"}
                    </button>
                  </form>
                </div>
              </li>
            ))}
            {notifications?.length ? null : (
              <li className="rounded-2xl bg-black/5 p-5 text-sm text-[var(--muted)]">
                You have no notifications.
              </li>
            )}
          </ul>
        </section>
        <aside>
          <form
            action={updateNotificationPreferencesAction}
            className="rounded-2xl border border-black/10 bg-[var(--surface)] p-5"
          >
            <input name="gymSlug" type="hidden" value={gym.slug} />
            <h2 className="text-xl font-black">Preferences</h2>
            <div className="mt-4 space-y-3">
              {toggles.map(([name, label, checked]) => (
                <label className="flex items-center gap-3 text-sm" key={name}>
                  <input defaultChecked={checked} name={name} type="checkbox" />
                  {label}
                </label>
              ))}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <label className="text-xs font-semibold">
                Quiet from
                <input
                  className="mt-1 min-h-10 w-full rounded-lg border border-black/10 px-2"
                  defaultValue={
                    preferences?.quiet_hours_start?.slice(0, 5) ?? ""
                  }
                  name="quietStart"
                  type="time"
                />
              </label>
              <label className="text-xs font-semibold">
                Until
                <input
                  className="mt-1 min-h-10 w-full rounded-lg border border-black/10 px-2"
                  defaultValue={preferences?.quiet_hours_end?.slice(0, 5) ?? ""}
                  name="quietEnd"
                  type="time"
                />
              </label>
            </div>
            <button className="mt-5 min-h-11 rounded-full bg-[var(--foreground)] px-5 text-sm font-bold text-white">
              Save preferences
            </button>
            <p className="mt-3 text-xs text-[var(--muted)]">
              Email and push remain disabled until a delivery provider is
              configured.
            </p>
          </form>
        </aside>
      </div>
      <PaginationNav hasNext={hasNext} page={page} pathname={`/g/${gym.slug}/app/notifications`} search={search}/>
    </div>
  );
}
