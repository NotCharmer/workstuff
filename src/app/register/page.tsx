"use client";

import { FormEvent, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SCHOOLS, type SchoolCode } from "@/lib/schools";
import { he } from "@/lib/i18n/he";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [branchCode, setBranchCode] = useState<SchoolCode>(SCHOOLS[0].code);
  const [pending, setPending] = useState(false);
  const [checkingGate, setCheckingGate] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function verifyGate() {
      try {
        const res = await fetch("/api/staff/gate-check");
        if (!cancelled && !res.ok) {
          router.replace("/login?register=1");
        }
      } catch {
        if (!cancelled) router.replace("/login?register=1");
      } finally {
        if (!cancelled) setCheckingGate(false);
      }
    }
    verifyGate();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError(he.register.passwordTooShort);
      return;
    }
    if (password !== confirmPassword) {
      setError(he.register.passwordMismatch);
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/staff/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim(), fullName: fullName.trim(), password, branchCode }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        setError(json?.error ?? he.register.saveFailed);
        if (res.status === 403) {
          router.replace("/login?register=1");
        }
        return;
      }

      const signInRes = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });
      if (!signInRes?.ok) {
        setError(he.register.loginAfterRegisterFailed);
        router.push("/login");
        return;
      }
      router.push("/pending-approval");
      router.refresh();
    } catch {
      setError(he.register.saveFailed);
    } finally {
      setPending(false);
    }
  }

  if (checkingGate) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/20 p-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">{he.register.title}</CardTitle>
          <CardDescription>{he.register.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="email" className="text-sm font-medium">
                {he.register.email}
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={he.register.emailPlaceholder}
                required
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="name" className="text-sm font-medium">
                {he.register.fullName}
              </label>
              <Input
                id="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={he.register.fullNamePlaceholder}
                required
                minLength={2}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="branch" className="text-sm font-medium">
                {he.register.branch}
              </label>
              <select
                id="branch"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={branchCode}
                onChange={(e) => setBranchCode(e.target.value as SchoolCode)}
                required
              >
                {SCHOOLS.map((school) => (
                  <option key={school.code} value={school.code}>
                    {school.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="password" className="text-sm font-medium">
                {he.register.password}
              </label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={he.register.passwordPlaceholder}
                required
                minLength={8}
                dir="ltr"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="confirm" className="text-sm font-medium">
                {he.register.confirmPassword}
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
            <p className="text-xs text-muted-foreground">{he.register.afterSubmit}</p>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : he.register.submit}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
