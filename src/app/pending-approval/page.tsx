import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { he } from "@/lib/i18n/he";

export default function PendingApprovalPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">{he.pendingApproval.title}</CardTitle>
          <CardDescription>{he.pendingApproval.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>{he.pendingApproval.step1}</p>
          <p>{he.pendingApproval.step2}</p>
        </CardContent>
      </Card>
    </div>
  );
}
