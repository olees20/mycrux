import { StandaloneShell } from "@/components/standalone-shell";

export default function JoinLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <StandaloneShell label="Join a gym" width="compact">{children}</StandaloneShell>;
}
