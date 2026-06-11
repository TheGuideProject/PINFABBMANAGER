import type { AiJob } from "@/generated/prisma/client";

// Implemented in Phase 5 (report templates + AI drafting).
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function runReportGeneration(_job: AiJob): Promise<unknown> {
  throw new Error("REPORT_GENERATION not implemented yet (Phase 5)");
}
