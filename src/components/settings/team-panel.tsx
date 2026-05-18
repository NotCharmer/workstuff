"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { he } from "@/lib/i18n/he";
import type { UserRole, UserStatus } from "@/lib/enums";

type TeamUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
};

type TeamPanelProps = {
  branchName: string | null;
  actorId: string;
  actorRole: UserRole;
  canManageTeam: boolean;
};

export function TeamPanel({ branchName, actorId, actorRole, canManageTeam }: TeamPanelProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/team/users");
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? he.team.loadFailed);
      setUsers(json.users);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : he.team.loadFailed;
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  async function createUser() {
    if (!name.trim() || !email.trim() || !password.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/team/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? he.team.createFailed);
      setName("");
      setEmail("");
      setPassword("");
      toast.success(he.team.created);
      await loadUsers();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : he.team.createFailed;
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function updateUser(
    userId: string,
    patch: Partial<{ role: UserRole; status: UserStatus; password: string }>
  ) {
    setSaving(true);
    try {
      const res = await fetch(`/api/team/users/${userId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? he.team.updateFailed);
      toast.success(patch.password ? he.team.passwordReset : he.team.updated);
      await loadUsers();
    } catch (e: unknown) {
      const fallback = patch.password ? he.team.passwordResetFailed : he.team.updateFailed;
      const message = e instanceof Error ? e.message : fallback;
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  const roleOptions: UserRole[] =
    actorRole === "ADMIN" ? ["STAFF", "BRANCH_MANAGER", "ADMIN"] : ["STAFF"];

  const statusOptions: UserStatus[] =
    actorRole === "ADMIN" ? ["PENDING", "ACTIVE", "BLOCKED"] : ["PENDING", "ACTIVE"];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{he.team.title}</CardTitle>
        <CardDescription>
          {branchName ? he.team.subtitleWithBranch(branchName) : he.team.subtitleNoBranch}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {canManageTeam ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-sm font-medium">{he.team.fullName}</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="שם מלא" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">{he.team.email}</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  dir="ltr"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">{he.team.password}</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="לפחות 8 תווים"
                  dir="ltr"
                />
              </div>
            </div>
            <Button onClick={createUser} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              {he.team.createButton}
            </Button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{he.team.viewOnlyHint}</p>
        )}

        <div className="space-y-2">
          <p className="text-sm font-medium">{he.team.listTitle}</p>
          {canManageTeam && (
            <p className="text-xs text-muted-foreground">{he.team.permissionsHint}</p>
          )}
          {loading ? (
            <p className="text-sm text-muted-foreground">{he.team.loading}</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-muted-foreground">{he.team.empty}</p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {users.map((u) => {
                const isSelf = u.id === actorId;
                const canEdit = canManageTeam && !isSelf;
                return (
                  <li
                    key={u.id}
                    className="flex flex-col gap-3 px-3 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium">
                        {u.name}
                        {isSelf && (
                          <span className="ms-2 text-xs text-muted-foreground">({he.team.you})</span>
                        )}
                      </p>
                      <p className="text-muted-foreground" dir="ltr">
                        {u.email}
                      </p>
                    </div>
                    {canEdit ? (
                      <div className="flex flex-wrap gap-2">
                        <select
                          value={u.role}
                          disabled={saving}
                          onChange={(e) =>
                            updateUser(u.id, { role: e.target.value as UserRole })
                          }
                          className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
                          aria-label={he.team.roleLabel}
                        >
                          {roleOptions.map((r) => (
                            <option key={r} value={r}>
                              {he.team.roles[r]}
                            </option>
                          ))}
                        </select>
                        <select
                          value={u.status}
                          disabled={saving}
                          onChange={(e) =>
                            updateUser(u.id, { status: e.target.value as UserStatus })
                          }
                          className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
                          aria-label={he.team.statusLabel}
                        >
                          {statusOptions.map((s) => (
                            <option key={s} value={s}>
                              {he.team.statuses[s]}
                            </option>
                          ))}
                        </select>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={saving}
                          onClick={() => {
                            const nextPassword = window.prompt(he.team.resetPasswordPlaceholder);
                            if (!nextPassword) return;
                            if (nextPassword.length < 8) {
                              toast.error(he.team.resetPasswordPlaceholder);
                              return;
                            }
                            void updateUser(u.id, { password: nextPassword });
                          }}
                        >
                          {he.team.resetPasswordButton}
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Badge variant="outline">{he.team.roles[u.role] ?? u.role}</Badge>
                        <Badge variant={u.status === "ACTIVE" ? "success" : "secondary"}>
                          {he.team.statuses[u.status] ?? u.status}
                        </Badge>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
