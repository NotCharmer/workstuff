import { UploadCloud, ScanLine, ListChecks, Save, PenLine } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UploadDropzone } from "./upload-dropzone";
import { ManualEntryPanel } from "@/components/upload/manual-entry-panel";
import { he } from "@/lib/i18n/he";

export const dynamic = "force-dynamic";

const STEPS: { icon: LucideIcon; title: string; desc: string }[] = [
  { icon: UploadCloud, title: he.upload.step1t, desc: he.upload.step1d },
  { icon: ScanLine, title: he.upload.step2t, desc: he.upload.step2d },
  { icon: ListChecks, title: he.upload.step3t, desc: he.upload.step3d },
  { icon: Save, title: he.upload.step4t, desc: he.upload.step4d },
];

export default function UploadPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {he.upload.title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{he.upload.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step) => (
          <Card key={step.title}>
            <CardContent className="flex items-start gap-3 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <step.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">{step.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{step.desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{he.upload.dropTitle}</CardTitle>
          <CardDescription>{he.upload.dropDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="file" className="w-full">
            <TabsList className="mb-4 grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="file" className="gap-2">
                <UploadCloud className="h-4 w-4" />
                {he.upload.tabFile}
              </TabsTrigger>
              <TabsTrigger value="manual" className="gap-2">
                <PenLine className="h-4 w-4" />
                {he.upload.tabManual}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="file">
              <UploadDropzone />
            </TabsContent>
            <TabsContent value="manual">
              <ManualEntryPanel />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}


