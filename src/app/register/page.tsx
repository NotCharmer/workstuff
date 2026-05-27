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
import { cn } from "@/lib/utils";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [branchCodes, setBranchCodes] = useState<SchoolCode[]>([]);
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

  function toggleBranch(code: SchoolCode) {
    setBranchCodes((prev) =>
      prev.includes(code) ? prev.filter((item) => item !== code) : [...prev, code]
    );
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (branchCodes.length === 0) {
      setError(he.register.branchRequired);
      return;
    }
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
        body: JSON.stringify({
          email: email.trim(),
          fullName: fullName.trim(),
          password,
          branchCodes,
        }),
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
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">{he.register.branches}</legend>
              <p className="text-xs text-muted-foreground">{he.register.branchesHint}</p>
              <ul className="space-y-2 rounded-lg border border-border/60 p-3">
                {SCHOOLS.map((school) => {
                  const checked = branchCodes.includes(school.code);
                  return (
                    <li key={school.code}>
                      <label
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors",
                          checked ? "bg-primary/10" : "hover:bg-muted/50"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleBranch(school.code)}
                          className="h-4 w-4 rounded border-input"
                        />
                        <span>{school.name}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </fieldset>
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
