import { AppShell } from "@/components/app-shell";
import { requirePageMembership } from "@/lib/server/authorization";

export default async function ProtectedLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await requirePageMembership();
  return <AppShell>{children}</AppShell>;
}
