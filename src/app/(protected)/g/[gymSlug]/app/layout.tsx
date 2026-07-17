import { AppShell } from "@/components/app-shell";
import { requireActiveGymContext } from "@/lib/server/gym-context";

export default async function GymAppLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ gymSlug: string }>;
}>) {
  const { gymSlug } = await params;
  const { gym, gyms } = await requireActiveGymContext({ gymSlug });
  return <AppShell gym={gym} gyms={gyms}>{children}</AppShell>;
}
