import type { Session } from "next-auth";
import { prisma } from "@/server/db";
import { auth } from "@/server/auth";

/** Session + technician profile, or throws. For /tech flows. */
export async function requireTechnician() {
  const session = await auth();
  if (!session?.user) throw new Error("UNAUTHENTICATED");
  if (session.user.role !== "TECHNICIAN") throw new Error("FORBIDDEN");
  const technician = await prisma.technician.findUnique({
    where: { userId: session.user.id },
  });
  if (!technician) throw new Error("FORBIDDEN");
  return { session, technician };
}

/** Managers see everything; technicians only projects they're assigned to. */
export async function canAccessProject(session: Session, projectId: string) {
  if (session.user.role !== "TECHNICIAN") return true;
  const assignment = await prisma.assignment.findFirst({
    where: {
      projectId,
      technician: { userId: session.user.id },
      status: { not: "CANCELLED" },
    },
    select: { id: true },
  });
  return !!assignment;
}

/**
 * Storage keys are namespaced (`projects/{id}/…`, `reports/{reportId}/…`).
 * Project-scoped keys follow project access; everything else is back-office only.
 */
export async function canAccessStorageKey(session: Session, key: string) {
  const projectMatch = key.match(/^projects\/([^/]+)\//);
  if (projectMatch) return canAccessProject(session, projectMatch[1]);
  return session.user.role !== "TECHNICIAN";
}
