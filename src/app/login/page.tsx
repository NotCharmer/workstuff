"use client";

import { FormEvent, Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Loader2, LogIn } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { he } from "@/lib/i18n/he";

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl")?.trim() || "/dashboard";
  const showRegisterHint = searchParams.get("register") === "1";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(
    showRegisterHint ? he.staffGate.gateRequired : null
  );

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const gateRes = await fetch("/api/staff/gate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (gateRes.ok) {
        window.location.href = "/register";
        return;
      }

      const res = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
        callbackUrl,
      });
      if (!res) {
        setError("לא התקבלה תשובה מהשרת. נסו שוב.");
        return;
      }
      if (!res.ok) {
        if (res.error === "CredentialsSignin") {
          setError("אימייל או סיסמה שגויים, או שהמשתמש לא קיים במערכת.");
        } else {
          setError(res.error ? `הכניסה נכשלה: ${res.error}` : "הכניסה נכשלה.");
        }
        return;
      }
      const target = res.url ?? callbackUrl;
      window.location.href = target.startsWith("http")
        ? target
        : `${window.location.origin}${target.startsWith("/") ? target : `/${target}`}`;
    } catch {
      setError("שגיאת רשת או שרת. ודאו ש-DATABASE_URL זמין (במיוחד בלוקאל).");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">כניסה למערכת</CardTitle>
          <CardDescription>
            משתמשים קיימים — אימייל וסיסמה אישית. עובדים חדשים — שער כניסה להרשמה.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 rounded-lg border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
            <p>
              <strong className="text-foreground">{he.staffGate.loginStep1Title}</strong>{" "}
              {he.staffGate.loginStep1Body}{" "}
              <span dir="ltr">staff@mercaz.local</span> + <span dir="ltr">Staff123!</span>
            </p>
            <p>
              <strong className="text-foreground">{he.staffGate.loginStep2Title}</strong>{" "}
              {he.staffGate.loginStep2Body}
            </p>
            <p>
              <strong className="text-foreground">{he.staffGate.loginStep3Title}</strong>{" "}
              {he.staffGate.loginStep3Body}
            </p>
          </div>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="email" className="text-sm font-medium">
                אימייל
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="password" className="text-sm font-medium">
                סיסמה
              </label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full gap-2" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
              כניסה / המשך להרשמה
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-muted/20 p-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
