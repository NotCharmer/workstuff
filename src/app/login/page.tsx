import { isPasswordlessLocalAuth } from "@/lib/local-auth";
import { LoginPageClient } from "./login-form";

export default function LoginPage() {
  return <LoginPageClient passwordlessLocal={isPasswordlessLocalAuth()} />;
}
