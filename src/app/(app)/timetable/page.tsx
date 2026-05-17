import { prisma } from "@/lib/db";
import { he } from "@/lib/i18n/he";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TimetableUploader } from "@/components/timetable/timetable-uploader";
import { EditableTimetableGrid } from "@/components/timetable/editable-timetable-grid";
import { getCurrentUserOrRedirect } from "@/lib/auth";
import { getViewBranchId } from "@/lib/branch-scope";

export const dynamic = "force-dynamic";

export default async function TimetablePage() {
  const user = await getCurrentUserOrRedirect();
  const branchId = await getViewBranchId(user);
  const entries = await prisma.timetableEntry.findMany({
    where: { branchId: branchId },
    orderBy: [{ className: "asc" }, { startTime: "asc" }],
  });

  const grouped = new Map<string, typeof entries>();
  for (const e of entries) {
    const arr = grouped.get(e.className) ?? [];
    arr.push(e);
    grouped.set(e.className, arr);
  }
  const classes = [...grouped.keys()];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">{he.timetable.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{he.timetable.subtitle}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{he.timetable.uploadTitle}</CardTitle>
          <CardDescription>{he.timetable.uploadDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <TimetableUploader />
        </CardContent>
      </Card>

      {classes.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            {he.timetable.noRows}
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue={classes[0]} className="space-y-4">
          <TabsList className="h-auto w-full justify-start overflow-x-auto p-1">
            {classes.map((className) => (
              <TabsTrigger key={className} value={className} className="min-w-[120px]">
                {className}
              </TabsTrigger>
            ))}
          </TabsList>

          {classes.map((className) => {
            const rows = grouped.get(className) ?? [];

            return (
              <TabsContent key={className} value={className}>
                <EditableTimetableGrid
                  className={className}
                  initialRows={rows.map((r) => ({
                    id: r.id,
                    className: r.className,
                    dayOfWeek: r.dayOfWeek,
                    startTime: r.startTime,
                    endTime: r.endTime,
                    subject: r.subject,
                    teacher: r.teacher,
                    room: r.room,
                  }))}
                />
              </TabsContent>
            );
          })}
        </Tabs>
      )}
    </div>
  );
}
