import type { Prisma } from "@prisma/client";
import type { CurrentUser } from "@/lib/auth";
import type { UserRole } from "@/lib/enums";
import { prisma } from "@/lib/db";

export type DailyTaskScope = "all" | "general" | "personal";

export type DailyTaskRecord = {
  id: string;
  branchId: string | null;
  authorId: string | null;
  assigneeId: string | null;
  title: string;
  done: boolean;
  date: string;
};

const taskInclude = {
  author: { select: { id: true, name: true } },
  assignee: { select: { id: true, name: true } },
} satisfies Prisma.DailyTaskInclude;

export function canManageOthersTasks(role: UserRole): boolean {
  return role === "ADMIN" || role === "BRANCH_MANAGER";
}

export function isGeneralTask(task: { assigneeId: string | null }): boolean {
  return task.assigneeId === null;
}

export async function assertActiveUserInBranch(
  userId: string,
  branchId: string
): Promise<{ id: string; name: string; role: string }> {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      status: "ACTIVE",
      OR: [{ branchId }, { branchAccess: { some: { branchId } } }],
    },
    select: { id: true, name: true, role: true },
  });
  if (!user) {
    throw new Error("ASSIGNEE_NOT_IN_BRANCH");
  }
  return user;
}

export function resolveScopeForUser(
  user: CurrentUser,
  requestedScope: string | null
): DailyTaskScope {
  if (canManageOthersTasks(user.role)) {
    if (requestedScope === "general" || requestedScope === "personal") {
      return requestedScope;
    }
    return "all";
  }
  return "all";
}

export async function buildTaskLists(
  user: CurrentUser,
  branchId: string | null,
  date: string,
  scope: DailyTaskScope,
  personalAssigneeId?: string | null
) {
  if (!branchId) {
    return { general: [], personal: [] };
  }

  const baseWhere = { branchId, date } as const;

  if (scope === "general") {
    const general = await prisma.dailyTask.findMany({
      where: { ...baseWhere, assigneeId: null },
      orderBy: { createdAt: "asc" },
      include: taskInclude,
    });
    return { general, personal: [] };
  }

  if (scope === "personal") {
    const assigneeId =
      personalAssigneeId ??
      (canManageOthersTasks(user.role) ? null : user.id);

    if (!assigneeId) {
      return { general: [], personal: [] };
    }

    if (!canManageOthersTasks(user.role) && assigneeId !== user.id) {
      return { general: [], personal: [] };
    }

    if (canManageOthersTasks(user.role) && assigneeId !== user.id) {
      await assertActiveUserInBranch(assigneeId, branchId);
    }

    const personal = await prisma.dailyTask.findMany({
      where: { ...baseWhere, assigneeId },
      orderBy: { createdAt: "asc" },
      include: taskInclude,
    });
    return { general: [], personal };
  }

  const [general, personal] = await Promise.all([
    prisma.dailyTask.findMany({
      where: { ...baseWhere, assigneeId: null },
      orderBy: { createdAt: "asc" },
      include: taskInclude,
    }),
    prisma.dailyTask.findMany({
      where: { ...baseWhere, assigneeId: user.id },
      orderBy: { createdAt: "asc" },
      include: taskInclude,
    }),
  ]);

  return { general, personal };
}

export async function resolveCreateAssigneeId(
  user: CurrentUser,
  branchId: string | null,
  requestedAssigneeId: string | null | undefined
): Promise<string | null> {
  if (requestedAssigneeId === undefined || requestedAssigneeId === null || requestedAssigneeId === "") {
    return null;
  }

  if (!canManageOthersTasks(user.role) && requestedAssigneeId !== user.id) {
    throw new Error("FORBIDDEN_ASSIGNEE");
  }

  if (!branchId) {
    throw new Error("NO_BRANCH");
  }

  if (canManageOthersTasks(user.role) && requestedAssigneeId !== user.id) {
    await assertActiveUserInBranch(requestedAssigneeId, branchId);
  }

  return requestedAssigneeId;
}

export async function loadTaskForUser(
  taskId: string,
  branchId: string | null
): Promise<DailyTaskRecord | null> {
  if (!branchId) return null;
  return prisma.dailyTask.findFirst({
    where: { id: taskId, branchId },
    select: {
      id: true,
      branchId: true,
      authorId: true,
      assigneeId: true,
      title: true,
      done: true,
      date: true,
    },
  });
}

export function assertCanModifyTask(user: CurrentUser, task: DailyTaskRecord): void {
  if (canManageOthersTasks(user.role)) {
    return;
  }

  if (isGeneralTask(task)) {
    return;
  }

  if (task.assigneeId !== user.id && task.authorId !== user.id) {
    throw new Error("FORBIDDEN");
  }
}

export function assertCanDeleteTask(user: CurrentUser, task: DailyTaskRecord): void {
  if (canManageOthersTasks(user.role)) {
    return;
  }

  if (isGeneralTask(task)) {
    if (task.authorId !== user.id) {
      throw new Error("FORBIDDEN");
    }
    return;
  }

  if (task.authorId !== user.id) {
    throw new Error("FORBIDDEN");
  }
}

export { taskInclude };
