"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Branch = {
  id: string;
  code: string;
  name: string;
  _count?: { users: number; students: number };
};

type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "BRANCH_MANAGER" | "STAFF";
  status: "PENDING" | "ACTIVE" | "BLOCKED";
  onboardingCompleted?: boolean;
  requestedBranchCode?: string | null;
  branchId: string | null;
  branch?: { id: string; code: string; name: string } | null;
};

export function AdminPanel({ role }: { role: "ADMIN" | "BRANCH_MANAGER" }) {
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [saving, setSaving] = useState(false);

  const [branchCode, setBranchCode] = useState("");
  const [branchName, setBranchName] = useState("");

  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [userRole, setUserRole] = useState<"ADMIN" | "BRANCH_MANAGER" | "STAFF">("STAFF");
  const [userBranchId, setUserBranchId] = useState("");

  const branchById = useMemo(() => new Map(branches.map((b) => [b.id, b])), [branches]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [bRes, uRes] = await Promise.all([
        fetch("/api/admin/branches"),
        fetch("/api/admin/users"),
      ]);
      const bJson = await bRes.json();
      const uJson = await uRes.json();
      if (!bRes.ok || !bJson.ok) throw new Error(bJson.error ?? "Failed loading branches");
      if (!uRes.ok || !uJson.ok) throw new Error(uJson.error ?? "Failed loading users");
      setBranches(bJson.branches);
      setUsers(uJson.users);
      if (!userBranchId && bJson.branches[0]?.id) setUserBranchId(bJson.branches[0].id);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed loading admin data");
    } finally {
      setLoading(false);
    }
  }, [userBranchId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function createBranch() {
    if (!branchCode.trim() || !branchName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/branches", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: branchCode.trim(), name: branchName.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Failed creating branch");
      setBranchCode("");
      setBranchName("");
      toast.success("Branch created");
      await loadAll();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed creating branch");
    } finally {
      setSaving(false);
    }
  }

  async function createUser() {
    if (!userName.trim() || !userEmail.trim() || !userPassword.trim() || !userBranchId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: userName.trim(),
          email: userEmail.trim(),
          password: userPassword,
          role: userRole,
          branchId: userBranchId,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Failed creating user");
      setUserName("");
      setUserEmail("");
      setUserPassword("");
      setUserRole("STAFF");
      toast.success("User created");
      await loadAll();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed creating user");
    } finally {
      setSaving(false);
    }
  }

  async function purgeAllStudents() {
    if (
      !window.confirm(
        "למחוק את כל התלמידים במערכת? פעולה זו בלתי הפיכה. ציונים והערות שלהם יימחקו גם כן."
      )
    ) {
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/purge-students", { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? "מחיקה נכשלה");
      toast.success(`נמחקו ${json.deletedStudents} תלמידים`);
      await loadAll();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "מחיקה נכשלה";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function updateUser(
    userId: string,
    patch: Partial<{
      role: "ADMIN" | "BRANCH_MANAGER" | "STAFF";
      status: "PENDING" | "ACTIVE" | "BLOCKED";
      branchId: string;
      password: string;
    }>
  ) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Failed updating user");
      toast.success(patch.password ? "Password reset" : "User updated");
      await loadAll();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed updating user");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
        <Loader2 className="me-2 h-4 w-4 animate-spin" />
        Loading admin panel...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Branch Management</CardTitle>
          <CardDescription>
            {role === "ADMIN" ? "Create and review district branches." : "Review your branch scope."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {role === "ADMIN" && (
            <div className="grid gap-3 sm:grid-cols-3">
              <Input
                value={branchCode}
                onChange={(e) => setBranchCode(e.target.value)}
                placeholder="branch-code"
              />
              <Input
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="Branch name"
              />
              <Button onClick={createBranch} disabled={saving}>
                Add branch
              </Button>
            </div>
          )}
          <ul className="space-y-2 text-sm">
            {branches.map((b) => (
              <li key={b.id} className="rounded border border-border/60 p-2">
                {b.name} ({b.code}) • users: {b._count?.users ?? 0} • students: {b._count?.students ?? 0}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>
            {role === "ADMIN"
              ? "Invite staff and assign branch/role."
              : "Invite staff and manage users in your branch."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Input value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="Full name" />
            <Input value={userEmail} onChange={(e) => setUserEmail(e.target.value)} placeholder="Email" />
            <Input
              type="password"
              value={userPassword}
              onChange={(e) => setUserPassword(e.target.value)}
              placeholder="Password"
            />
            <select
              value={userRole}
              onChange={(e) => setUserRole(e.target.value as "ADMIN" | "BRANCH_MANAGER" | "STAFF")}
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="STAFF">STAFF</option>
              {role === "ADMIN" && <option value="BRANCH_MANAGER">BRANCH_MANAGER</option>}
              {role === "ADMIN" && <option value="ADMIN">ADMIN</option>}
            </select>
            <select
              value={userBranchId}
              onChange={(e) => setUserBranchId(e.target.value)}
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
              disabled={role !== "ADMIN"}
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <Button onClick={createUser} disabled={saving}>
            Create user
          </Button>

          <ul className="space-y-2 text-sm">
            {users.map((u) => (
              <li key={u.id} className="rounded border border-border/60 p-2">
                <div className="mb-2 font-medium">
                  {u.name} • {u.email}
                </div>
                {!u.onboardingCompleted && (
                  <div className="mb-2 text-xs text-amber-600">onboarding not completed</div>
                )}
                {u.requestedBranchCode && (
                  <div className="mb-2 text-xs text-muted-foreground">
                    requested branch: {u.requestedBranchCode}
                  </div>
                )}
                <div className="grid gap-2 sm:grid-cols-2">
                  <select
                    value={u.role}
                    onChange={(e) =>
                      updateUser(u.id, {
                        role: e.target.value as "ADMIN" | "BRANCH_MANAGER" | "STAFF",
                      })
                    }
                    className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
                  >
                    <option value="STAFF">STAFF</option>
                    {role === "ADMIN" && <option value="BRANCH_MANAGER">BRANCH_MANAGER</option>}
                    {role === "ADMIN" && <option value="ADMIN">ADMIN</option>}
                  </select>
                  <select
                    value={u.branchId ?? ""}
                    onChange={(e) => updateUser(u.id, { branchId: e.target.value })}
                    className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
                    disabled={role !== "ADMIN"}
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <select
                    value={u.status}
                    onChange={(e) =>
                      updateUser(u.id, {
                        status: e.target.value as "PENDING" | "ACTIVE" | "BLOCKED",
                      })
                    }
                    className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
                    disabled={role !== "ADMIN"}
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="BLOCKED">BLOCKED</option>
                  </select>
                  <div className="self-center text-xs text-muted-foreground">status: {u.status}</div>
                </div>
                <div className="mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={saving}
                    onClick={() => {
                      const nextPassword = window.prompt("New password (min 8 chars)");
                      if (!nextPassword) return;
                      if (nextPassword.length < 8) {
                        toast.error("Password must be at least 8 characters");
                        return;
                      }
                      void updateUser(u.id, { password: nextPassword });
                    }}
                  >
                    Reset password
                  </Button>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  current branch: {branchById.get(u.branchId ?? "")?.name ?? "—"}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {role === "ADMIN" && (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-destructive">אזור מסוכן</CardTitle>
            <CardDescription>
              מחיקת כל התלמידים (למשל נתוני דמו). מקצועות וסשני העלאה נשארים; אפשר למחוק ידנית ב-Neon.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              onClick={purgeAllStudents}
              disabled={saving}
              className="gap-2"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              מחק את כל התלמידים
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
