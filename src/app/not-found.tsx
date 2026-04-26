import Link from "next/link";
import { Button } from "@/components/ui/button";
import { he } from "@/lib/i18n/he";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="font-display text-7xl font-semibold tracking-tight">404</div>
      <p className="max-w-sm text-muted-foreground">{he.notFound.body}</p>
      <Button asChild>
        <Link href="/dashboard">{he.notFound.back}</Link>
      </Button>
    </div>
  );
}
