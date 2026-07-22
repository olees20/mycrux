import Image from "next/image";
import Link from "next/link";
import { PaginationNav } from "@/components/pagination-nav";
import { parsePage } from "@/lib/pagination";
import { requireActiveGymContext } from "@/lib/server/gym-context";
import { createServerComponentSupabaseClient } from "@/lib/supabase/server";
export default async function EventsPage({
  params,
  searchParams,
}: {
  params: Promise<{ gymSlug: string }>;
  searchParams: Promise<{ view?: string; page?: string }>;
}) {
  const [{ gymSlug }, search] = await Promise.all([params, searchParams]);
  const { gym } = await requireActiveGymContext({ gymSlug });
  const supabase = await createServerComponentSupabaseClient();
  const page = parsePage(search.page), pageSize = 24, offset = (page - 1) * pageSize;
  const [{ data: settings }, { data: eventRows }] = await Promise.all([
    supabase.from("gyms").select("timezone").eq("id", gym.id).single(),
    supabase
      .from("events")
      .select(
        "id,event_type,title,description,location,starts_at,ends_at,capacity,image_path",
      )
      .eq("gym_id", gym.id)
      .eq("status", "published")
      .gte("ends_at", new Date().toISOString())
      .order("starts_at")
      .range(offset, offset + pageSize),
  ]);
  const hasNext = (eventRows?.length ?? 0) > pageSize, events = (eventRows ?? []).slice(0, pageSize);
  const timezone = settings?.timezone ?? "Europe/London",
    view = search.view === "calendar" ? "calendar" : "list";
  const imagePaths = events.flatMap((event) => event.image_path ? [event.image_path] : []);
  const { data: signedImages } = imagePaths.length ? await supabase.storage.from("event-images").createSignedUrls(imagePaths, 3600) : { data: [] };
  const imageUrls = new Map((signedImages ?? []).map((item) => [item.path, item.signedUrl]));
  const cards = events.map((event) => ({ ...event, imageUrl: event.image_path ? imageUrls.get(event.image_path) ?? null : null }));
  const grouped = new Map<string, typeof cards>();
  for (const event of cards) {
    const day = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(event.starts_at));
    grouped.set(day, [...(grouped.get(day) ?? []), event]);
  }
  const base = `/g/${gym.slug}/app/events`;
  return (
    <div className="mx-auto max-w-[var(--content)]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="app-eyebrow text-[var(--muted)]">
            Events
          </p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-[-.035em]">What’s happening</h1>
        </div>
        <div className="flex rounded-full border bg-[var(--surface)] p-1">
          <Link
            className={`rounded-full px-4 py-2 text-sm font-bold ${view === "list" ? "bg-[var(--primary)] text-white" : ""}`}
            href={base}
          >
            List
          </Link>
          <Link
            className={`rounded-full px-4 py-2 text-sm font-bold ${view === "calendar" ? "bg-[var(--primary)] text-white" : ""}`}
            href={`${base}?view=calendar`}
          >
            Calendar
          </Link>
        </div>
      </div>
      {view === "calendar" ? (
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...grouped].map(([day, items]) => (
            <section
              className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5"
              key={day}
            >
              <h2 className="font-black">
                {new Intl.DateTimeFormat("en-GB", {
                  timeZone: timezone,
                  dateStyle: "full",
                }).format(new Date(`${day}T12:00:00Z`))}
              </h2>
              <ul className="mt-3 space-y-2">
                {items.map((event) => (
                  <li key={event.id}>
                    <Link
                      className="block rounded-[var(--radius-sm)] bg-[var(--surface-subtle)] p-3"
                      href={`${base}/${event.id}`}
                    >
                      <strong>{event.title}</strong>
                      <span className="block text-xs">
                        {new Intl.DateTimeFormat("en-GB", {
                          timeZone: timezone,
                          timeStyle: "short",
                        }).format(new Date(event.starts_at))}{" "}
                        · {event.location ?? "Location TBC"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((event) => (
            <article
              className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]"
              key={event.id}
            >
              {event.imageUrl ? (
                <Image
                  alt=""
                  className="aspect-video w-full object-cover"
                  height={600}
                  src={event.imageUrl}
                  width={1000}
                />
              ) : null}
              <div className="p-5">
                <p className="text-xs font-bold uppercase text-[var(--muted)]">
                  {event.event_type}
                </p>
                <h2 className="mt-2 text-xl font-black">{event.title}</h2>
                <p className="mt-2 text-sm">
                  {new Intl.DateTimeFormat("en-GB", {
                    timeZone: timezone,
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(event.starts_at))}
                </p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {event.location ?? "Location TBC"}
                </p>
                <Link
                  className="mt-4 inline-flex min-h-11 items-center font-bold underline"
                  href={`${base}/${event.id}`}
                >
                  View and book
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
      <PaginationNav hasNext={hasNext} page={page} pathname={base} search={search}/>
    </div>
  );
}
