import { getCurrentUserOrRedirect } from "@/lib/auth";
import { getViewBranchContext } from "@/lib/branch-scope";
import { userCanSwitchBranches } from "@/lib/user-branches";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUserOrRedirect();
  const view = await getViewBranchContext(user);
  const canSwitchSchools = await userCanSwitchBranches(user.id, user.role);

  return (
    <div className="flex min-h-screen gradient-surface">
      <Sidebar canSwitchSchools={canSwitchSchools} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          user={{
            name: user.name,
            email: user.email,
            branchName: view.viewBranchName ?? user.branchName,
          }}
        />
        <main className="flex-1 px-4 py-6 md:px-8 md:py-10">
          <div className="mx-auto w-full max-w-[1400px] animate-fade-in">{children}</div>
        </main>
      </div>
    </div>
  );
}
