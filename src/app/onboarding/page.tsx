"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { he } from "@/lib/i18n/he";

export default function OnboardingPage() {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError(he.onboarding.passwordTooShort);
      return;
    }
    if (password !== confirmPassword) {
      setError(he.onboarding.passwordMismatch);
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fullName: fullName.trim(), password }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        setError(json?.error ?? he.onboarding.saveFailed);
        return;
      }
      await updateSession();
      router.replace("/pending-approval");
      router.refresh();
    } catch {
      setError(he.onboarding.saveFailed);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">{he.onboarding.title}</CardTitle>
          <CardDescription>{he.onboarding.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="name" className="text-sm font-medium">
                {he.onboarding.fullName}
              </label>
              <Input
                id="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={he.onboarding.fullNamePlaceholder}
                required
                minLength={2}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="password" className="text-sm font-medium">
                {he.onboarding.password}
              </label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={he.onboarding.passwordPlaceholder}
                required
                minLength={8}
                dir="ltr"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="confirm" className="text-sm font-medium">
                {he.onboarding.confirmPassword}
              </label>
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                dir="ltr"
              />
            </div>
            <p className="text-xs text-muted-foreground">{he.onboarding.afterSubmit}</p>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                he.onboarding.submit
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
