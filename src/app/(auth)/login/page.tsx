import { AuthForm } from "@/components/auth-form";
import { loginAction } from "@/features/auth/actions";
import { safeRedirectPath } from "@/lib/auth/redirect";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const parameters = await searchParams;
  return <AuthForm action={loginAction} mode="login" next={safeRedirectPath(parameters.next)} />;
}
