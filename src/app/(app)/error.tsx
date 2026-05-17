"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AppSectionError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const isDb =
    error.message.includes("Can't reach database") ||
    error.message.includes("P1001") ||
    error.message.includes("database server");

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>שגיאה בטעינת האפליקציה</CardTitle>
          <CardDescription>
            {isDb
              ? "השרת לא הצליח להתחבר למסד הנתונים (Neon). זה בדרך כלל קשור ל־DATABASE_URL ב־Vercel או לחסימת רשת."
              : "אירעה שגיאה בצד השרת. נסו לרענן או להתחבר מחדש."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {error.digest && (
            <p className="text-xs text-muted-foreground">Digest: {error.digest}</p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={reset}>
              נסה שוב
            </Button>
            <Button asChild variant="secondary">
              <Link href="/login">חזרה להתחברות</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
