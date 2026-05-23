import { ReviewEditor } from "./review-editor";
import { he } from "@/lib/i18n/he";
import { getCurrentUserOrRedirect } from "@/lib/auth";
import { requireViewBranchId } from "@/lib/branch-scope";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const user = await getCurrentUserOrRedirect();
  const activeBranchId = await requireViewBranchId(user);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {he.review.title}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          {he.review.subtitle}
        </p>
      </div>
      <ReviewEditor activeBranchId={activeBranchId} />
    </div>
  );
}
