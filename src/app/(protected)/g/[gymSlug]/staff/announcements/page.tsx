import { notFound } from "next/navigation";
import { AnnouncementForm } from "@/components/announcement-form";
import { archiveAnnouncementAction } from "@/features/announcements/actions";
import { requireActiveGymContext } from "@/lib/server/gym-context";
import { createServerComponentSupabaseClient } from "@/lib/supabase/server";

export default async function StaffAnnouncementsPage({ params }: { params: Promise<{ gymSlug: string }> }) {
  const { gymSlug } = await params;
  const { gym } = await requireActiveGymContext({ gymSlug, allowedRoles: ["owner", "staff"] });
  const supabase = await createServerComponentSupabaseClient();
  if (gym.role !== "owner") {
    const { data: membership } = await supabase.from("gym_memberships").select("staff_role_id").eq("id", gym.membershipId).single();
    const { data: role } = membership?.staff_role_id ? await supabase.from("staff_roles").select("capabilities").eq("id", membership.staff_role_id).single() : { data: null };
    if (!role?.capabilities.includes("announcements.manage")) notFound();
  }
  const [{ data: gymDetails }, { data: announcements }] = await Promise.all([
    supabase.from("gyms").select("timezone").eq("id", gym.id).single(),
    supabase.from("announcements").select("id,title,body,audience,priority,status,published_at,expires_at,is_pinned,created_at").eq("gym_id", gym.id).order("created_at", { ascending: false }),
  ]);
  const timezone = gymDetails?.timezone ?? "Europe/London";
  return (
    <div className="mx-auto max-w-5xl">
      <p className="app-eyebrow text-[var(--muted)]">Communications</p><h1 className="mt-3 text-4xl font-extrabold tracking-[-.035em]">Announcements</h1>
      <section className="mt-8 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5"><h2 className="mb-5 text-xl font-black">New announcement</h2><AnnouncementForm gymSlug={gym.slug} timezone={timezone} /></section>
      <section className="mt-8"><h2 className="text-xl font-black">History and schedule</h2><div className="mt-4 space-y-4">
        {announcements?.map((item) => <article className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5" key={item.id}><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h3 className="font-black">{item.title}</h3><span className="rounded-full bg-[var(--surface-subtle)] px-3 py-1 text-xs font-bold">{item.status} · {item.priority}</span></div><AnnouncementForm gymSlug={gym.slug} timezone={timezone} values={{ id:item.id,title:item.title,body:item.body,audience:item.audience,priority:item.priority,status:item.status,publishedAt:item.published_at,expiresAt:item.expires_at,isPinned:item.is_pinned }} />{item.status !== "archived" ? <form action={archiveAnnouncementAction} className="mt-3"><input name="gymSlug" type="hidden" value={gym.slug} /><input name="announcementId" type="hidden" value={item.id} /><button className="text-sm font-bold text-red-700">Archive announcement</button></form> : null}</article>)}
        {announcements?.length ? null : <p className="rounded-[var(--radius-lg)] bg-[var(--surface)] p-5 text-sm text-[var(--muted)]">No announcements yet.</p>}
      </div></section>
    </div>
  );
}
