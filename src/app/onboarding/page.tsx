"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function OnboardingPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [requestedBranchCode, setRequestedBranchCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fullName, requestedBranchCode }),
    });
    const json = await res.json().catch(() => null);
    setPending(false);
    if (!res.ok || !json?.ok) {
      setError(json?.error ?? "שמירת פרטים נכשלה");
      return;
    }
    router.push("/pending-approval");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">השלמת הרשמה</CardTitle>
          <CardDescription>
            השלימו את פרטי המשתמש הפנימי שלכם במערכת. לאחר שליחה תמתינו לאישור מנהל.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="name" className="text-sm font-medium">
                שם מלא
              </label>
              <Input
                id="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="branch" className="text-sm font-medium">
                קוד סניף מבוקש
              </label>
              <Input
                id="branch"
                value={requestedBranchCode}
                onChange={(e) => setRequestedBranchCode(e.target.value)}
                placeholder="למשל: reh-01"
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "שליחת בקשה"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
