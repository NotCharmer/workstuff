"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { Loader2, LogIn } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const callbackUrl = "/dashboard";
  const defaultEmail =
    process.env.NEXT_PUBLIC_PRIMARY_LOGIN_EMAIL?.trim().toLowerCase() || "admin@district.local";
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await signIn("credentials", {
        email,
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
          setError("האימייל או הסיסמה שגויים, או שהמשתמש לא זמין כרגע.");
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
      setError("שגיאת רשת או שרת. נסו שוב.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">כניסה למערכת</CardTitle>
          <CardDescription>כניסה רגילה עם אימייל וסיסמה עבור המשתמש הראשי.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="email" className="text-sm font-medium">
                אימייל
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                dir="ltr"
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
              כניסה
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
