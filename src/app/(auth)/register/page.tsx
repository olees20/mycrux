import { AuthForm } from "@/components/auth-form";
import { registerAction } from "@/features/auth/actions";

export default function RegisterPage() {
  return <AuthForm action={registerAction} mode="register" />;
}
