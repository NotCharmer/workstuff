import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function PendingApprovalPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">החשבון ממתין לאישור</CardTitle>
          <CardDescription>
            התחברת בהצלחה עם חשבון המחוז, אבל עדיין לא קיבלת הרשאה למערכת.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>אנא פנו למנהל המחוז/הסניף כדי לאשר את המשתמש ולהקצות סניף.</p>
          <p>לאחר אישור תוכלו להיכנס כרגיל.</p>
        </CardContent>
      </Card>
    </div>
  );
}
