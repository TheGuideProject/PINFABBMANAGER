"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db";
import { requireRole } from "@/server/auth";
import {
  type ActionResult,
  failure,
  success,
} from "@/server/actions/action-result";

export async function retryJob(id: string): Promise<ActionResult> {
  await requireRole("ADMIN", "MANAGER");
  const job = await prisma.aiJob.findUnique({ where: { id } });
  if (!job) return failure("notFound");
  if (job.status !== "FAILED" && job.status !== "CANCELLED") {
    return failure("validation");
  }

  await prisma.aiJob.update({
    where: { id },
    data: {
      status: "PENDING",
      attempts: 0,
      error: null,
      runAt: new Date(),
      lockedBy: null,
      startedAt: null,
      finishedAt: null,
    },
  });
  revalidatePath("/manager/settings/jobs");
  return success;
}
