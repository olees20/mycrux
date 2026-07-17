import { AuthForm } from "@/components/auth-form";
import { forgotPasswordAction } from "@/features/auth/actions";

export default function ForgotPasswordPage() {
  return <AuthForm action={forgotPasswordAction} mode="forgot" />;
}
