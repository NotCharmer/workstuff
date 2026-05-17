import fs from "node:fs";
import path from "node:path";

const root = path.join(import.meta.dirname, "..");
const files = [
  "src/app/(app)/timetable/page.tsx",
  "src/app/(app)/private-lessons/page.tsx",
  "src/app/(app)/students/[id]/page.tsx",
  "src/app/(app)/analytics/page.tsx",
  "src/app/api/daily-summary/route.ts",
  "src/app/api/subjects/[id]/route.ts",
  "src/app/api/grades/[id]/route.ts",
  "src/app/api/timetable/confirm/route.ts",
  "src/app/api/notes/[id]/route.ts",
  "src/app/api/students/[id]/notes/route.ts",
  "src/app/api/daily-tasks/[id]/route.ts",
  "src/app/api/daily-tasks/route.ts",
  "src/app/api/class-visits/[id]/route.ts",
  "src/app/api/class-visits/route.ts",
  "src/app/api/private-lessons/[id]/route.ts",
  "src/app/api/private-lessons/route.ts",
  "src/app/api/students/[id]/route.ts",
  "src/app/api/students/[id]/grades/route.ts",
];

for (const rel of files) {
  const file = path.join(root, rel);
  let c = fs.readFileSync(file, "utf8");
  if (!c.includes('from "@/lib/branch-scope"')) {
    c = c.replace(
      /from "@\/lib\/auth";/,
      'from "@/lib/auth";\nimport { getViewBranchId } from "@/lib/branch-scope";'
    );
  }
  if (!c.includes("const branchId = await getViewBranchId(user)")) {
    c = c.replace(
      /const user = await getCurrentUserOrRedirect\(\);/g,
      "const user = await getCurrentUserOrRedirect();\n  const branchId = await getViewBranchId(user);"
    );
    c = c.replace(
      /const user = await getCurrentUser\(\);/g,
      "const user = await getCurrentUser();\n    const branchId = await getViewBranchId(user);"
    );
  }
  c = c.replace(/user\.branchId/g, "branchId");
  fs.writeFileSync(file, c);
  console.log("patched", rel);
}
