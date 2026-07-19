import { AuthForm } from "@/components/auth-form";
import { registerAction } from "@/features/auth/actions";
import { safeRedirectPath } from "@/lib/auth/redirect";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const parameters = await searchParams;
  return <AuthForm action={registerAction} mode="register" next={safeRedirectPath(parameters.next, "/onboarding")} />;
}
