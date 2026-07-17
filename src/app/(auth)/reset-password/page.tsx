import { AuthForm } from "@/components/auth-form";
import { resetPasswordAction } from "@/features/auth/actions";
import { requireUser } from "@/lib/server/authorization";

export default async function ResetPasswordPage() {
  await requireUser({ redirectTo: "/reset-password" });
  return <AuthForm action={resetPasswordAction} mode="reset" />;
}
