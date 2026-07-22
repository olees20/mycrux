import { StandaloneShell } from "@/components/standalone-shell";

export default function OnboardingLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <StandaloneShell label="Get started">{children}</StandaloneShell>;
}
