import { getCurrentUserOrRedirect } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";
import { he } from "@/lib/i18n/he";
import { AdminPanel } from "@/components/settings/admin-panel";
import {
  getOcrProviderName,
  getOpenAIApiKey,
  getOpenAIOcrModel,
} from "@/lib/server-env";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUserOrRedirect();
  const ocrProvider = getOcrProviderName();
  const hasKey = Boolean(getOpenAIApiKey());
  const model = getOpenAIOcrModel();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">{he.settings.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{he.settings.subtitle}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{he.settings.yourProfile}</CardTitle>
          <CardDescription>{he.settings.staffAccount}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <Avatar className="h-14 w-14">
            <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-violet-500 text-sm">
              {initials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold">{user.name}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            {user.branchName && (
              <p className="text-xs text-muted-foreground">Branch: {user.branchName}</p>
            )}
          </div>
          <Badge variant="info" className="ms-auto">
            {user.role}
          </Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{he.settings.ocrProvider}</CardTitle>
          <CardDescription>מצב פעיל + הסבר בקלף הבא (קובץ ‎.env)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 p-4">
            <div>
              <p className="text-sm font-semibold">{he.settings.currentlyActive}</p>
              <p className="text-xs text-muted-foreground">{he.settings.ocrModelLine(model)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge>{ocrProvider}</Badge>
              {ocrProvider === "openai" && (
                <Badge variant={hasKey ? "success" : "danger"}>
                  {hasKey ? he.settings.ocrKeyOk : he.settings.ocrKeyMissing}
                </Badge>
              )}
            </div>
          </div>
          <Separator />
          <ul className="space-y-2 text-sm">
            <li>
              <strong>mock</strong> — {he.settings.ocrList1}
            </li>
            <li>{he.settings.ocrList2}</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{he.settings.ocrEnvTitle}</CardTitle>
          <CardDescription>{he.settings.ocrEnvIntro}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="text-muted-foreground">{he.settings.ocrFileHint}</p>
          <dl className="space-y-4">
            <div className="rounded-lg border border-border/60 bg-card/50 p-4">
              <dt className="mb-1 font-mono text-xs text-primary">DATABASE_URL</dt>
              <dd className="text-muted-foreground leading-relaxed">{he.settings.ocrRowDb}</dd>
            </div>
            <div className="rounded-lg border border-border/60 bg-card/50 p-4">
              <dt className="mb-1 font-mono text-xs text-primary">OCR_PROVIDER</dt>
              <dd className="text-muted-foreground leading-relaxed">{he.settings.ocrRowProvider}</dd>
            </div>
            <div className="rounded-lg border border-border/60 bg-card/50 p-4">
              <dt className="mb-1 font-mono text-xs text-primary">OPENAI_API_KEY</dt>
              <dd className="text-muted-foreground leading-relaxed">{he.settings.ocrRowKey}</dd>
            </div>
            <div className="rounded-lg border border-border/60 bg-card/50 p-4">
              <dt className="mb-1 font-mono text-xs text-primary">OPENAI_OCR_MODEL</dt>
              <dd className="text-muted-foreground leading-relaxed">{he.settings.ocrRowModel}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{he.settings.coming}</CardTitle>
          <CardDescription>{he.settings.comingDesc}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {he.settings.features.map((f) => (
            <div
              key={f}
              className="rounded-lg border border-dashed border-border bg-card/50 p-3 text-sm text-muted-foreground"
            >
              {f}
            </div>
          ))}
        </CardContent>
      </Card>

      {(user.role === "ADMIN" || user.role === "BRANCH_MANAGER") && (
        <AdminPanel role={user.role} />
      )}
    </div>
  );
}
