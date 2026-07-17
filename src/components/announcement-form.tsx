"use client";

import { useActionState } from "react";
import { createAnnouncementAction, updateAnnouncementAction } from "@/features/announcements/actions";
import { isoToZonedInput } from "@/features/announcements/schedule";
import { initialAnnouncementActionState } from "@/features/announcements/state";

export type AnnouncementValues = Readonly<{ id?: string; title?: string; body?: string; audience?: string; priority?: string; status?: string; publishedAt?: string | null; expiresAt?: string | null; isPinned?: boolean }>;
const field = "mt-1 min-h-11 w-full rounded-lg border border-[var(--border)] bg-white px-3 font-normal";

export function AnnouncementForm({ gymSlug, timezone, values = {} }: { gymSlug: string; timezone: string; values?: AnnouncementValues }) {
  const editing = Boolean(values.id);
  const [state, action, pending] = useActionState(editing ? updateAnnouncementAction : createAnnouncementAction, initialAnnouncementActionState);
  const localValue = (value?: string | null) => value ? isoToZonedInput(value, timezone) : "";
  return (
    <form action={action} className="grid gap-4 md:grid-cols-2">
      <input name="gymSlug" type="hidden" value={gymSlug} /><input name="timezone" type="hidden" value={timezone} /><input name="announcementId" type="hidden" value={values.id ?? ""} />
      <label className="text-sm font-semibold md:col-span-2">Title<input className={field} defaultValue={values.title} name="title" required /></label>
      <label className="text-sm font-semibold md:col-span-2">Message<textarea className={`${field} min-h-32 py-3`} defaultValue={values.body} name="body" required /></label>
      <label className="text-sm font-semibold">Audience<select className={field} defaultValue={values.audience ?? "members"} name="audience"><option value="public">Public and members</option><option value="members">Members</option><option value="staff">Staff only</option></select></label>
      <label className="text-sm font-semibold">Priority<select className={field} defaultValue={values.priority ?? "normal"} name="priority"><option value="normal">Normal</option><option value="important">Important</option><option value="urgent">Urgent</option></select></label>
      <label className="text-sm font-semibold">Publication<select className={field} defaultValue={values.status === "published" ? "published" : "draft"} name="publication"><option value="draft">Draft</option><option value="published">Publish / schedule</option></select></label>
      <label className="text-sm font-semibold">Publish time ({timezone})<input className={field} defaultValue={localValue(values.publishedAt)} name="publishAt" type="datetime-local" /></label>
      <label className="text-sm font-semibold">Expiry time (optional)<input className={field} defaultValue={localValue(values.expiresAt)} name="expiresAt" type="datetime-local" /></label>
      <label className="flex items-center gap-3 self-end pb-3 text-sm font-semibold"><input defaultChecked={values.isPinned} name="isPinned" type="checkbox" />Pin while current</label>
      <div className="flex items-center gap-3 md:col-span-2"><button className="min-h-11 rounded-full bg-[var(--foreground)] px-5 text-sm font-bold text-white disabled:opacity-60" disabled={pending}>{pending ? "Saving…" : editing ? "Save announcement" : "Create announcement"}</button>{state.message ? <p className={state.status === "error" ? "text-sm text-red-700" : "text-sm text-green-800"}>{state.message}</p> : null}</div>
    </form>
  );
}
