"use client";

import { useMemo } from "react";
import { signIn } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const ssoError = useMemo(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("error");
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">כניסה למערכת</CardTitle>
          <CardDescription>התחברו עם חשבון מחוזי מאושר בלבד.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            type="button"
            className="w-full"
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          >
            כניסה עם Google (חשבון מחוזי)
          </Button>
          {ssoError === "google_not_allowed" && (
            <p className="text-sm text-destructive">אפשר להתחבר רק עם חשבון Google מחוזי מאושר.</p>
          )}
          {(ssoError === "Callback" || ssoError === "OAuthSignin" || ssoError === "OAuthCallback") && (
            <p className="text-sm text-destructive">
              כניסה עם Google נכשלה. בדקו ש־NEXTAUTH_URL ו־Google OAuth Redirect מוגדרים נכון.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
