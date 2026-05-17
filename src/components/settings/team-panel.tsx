"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { he } from "@/lib/i18n/he";

type TeamUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
};

export function TeamPanel({ branchName }: { branchName: string | null }) {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>{he.team.title}</CardTitle>
        <CardDescription>
          {branchName
            ? he.team.subtitleWithBranch(branchName)
            : he.team.subtitleNoBranch}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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
              placeholder="user@school.local"
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

        <div className="space-y-2">
          <p className="text-sm font-medium">{he.team.listTitle}</p>
          {loading ? (
            <p className="text-sm text-muted-foreground">{he.team.loading}</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-muted-foreground">{he.team.empty}</p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {users.map((u) => (
                <li
                  key={u.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">{u.name}</p>
                    <p className="text-muted-foreground" dir="ltr">
                      {u.email}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline">{u.role}</Badge>
                    <Badge variant={u.status === "ACTIVE" ? "success" : "secondary"}>
                      {u.status}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
