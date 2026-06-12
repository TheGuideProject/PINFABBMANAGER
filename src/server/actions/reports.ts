"use server";

import { revalidatePath } from "next/cache";
import { createId } from "@paralleldrive/cuid2";
import { z } from "zod";
import { prisma } from "@/server/db";
import { auth } from "@/server/auth";
import { canAccessProject } from "@/server/access";
import { storage } from "@/server/services/storage";
import { enqueueJob } from "@/server/jobs/enqueue";
import { renderReportPdf } from "@/server/services/pdf/report-pdf";
import { imagesToPdf, mergePdfs } from "@/server/services/pdf/assemble";
import { notifyManagers } from "@/server/services/notifications";
import { type ReportContent } from "@/lib/report-template";
import {
  type ActionResult,
  failure,
  success,
} from "@/server/actions/action-result";

async function requireReportAccess(reportId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("UNAUTHENTICATED");
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: { project: { select: { id: true, code: true } } },
  });
  if (!report) throw new Error("NOT_FOUND");
  if (!(await canAccessProject(session, report.projectId))) {
    throw new Error("FORBIDDEN");
  }
  return { session, report };
}

function revalidate(projectId: string, reportId: string) {
  revalidatePath(`/tech/jobs/${projectId}/report`);
  revalidatePath(`/manager/reports`);
  revalidatePath(`/manager/reports/${reportId}`);
}

/** Create (or return) the report for a project and queue AI drafting. */
export async function createProjectReport(projectId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return failure("genericError");
  if (!(await canAccessProject(session, projectId))) return failure("notFound");

  const existing = await prisma.report.findFirst({
    where: { projectId, status: { notIn: ["ARCHIVED"] } },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return success;

  const template = await prisma.reportTemplate.findFirst({
    where: { isActive: true },
    orderBy: { version: "desc" },
  });
  if (!template) return failure("notFound");

  await prisma.$transaction(async (tx) => {
    const report = await tx.report.create({
      data: { projectId, templateId: template.id, content: {} },
    });
    await enqueueJob("REPORT_GENERATION", { reportId: report.id }, tx);
  });

  revalidatePath(`/tech/jobs/${projectId}/report`);
  revalidatePath("/manager/reports");
  return success;
}

const sectionSchema = z.object({
  sectionKey: z.string().min(1),
  text: z.string(),
});

export async function saveReportSection(
  reportId: string,
  formData: FormData,
): Promise<ActionResult> {
  const { report } = await requireReportAccess(reportId);
  if (["FINALIZED", "SIGNED", "COUNTERSIGNED", "ARCHIVED"].includes(report.status)) {
    return failure("reportLocked");
  }

  const parsed = sectionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failure("validation");

  const content = (report.content ?? {}) as ReportContent;
  content[parsed.data.sectionKey] = parsed.data.text;

  await prisma.report.update({
    where: { id: reportId },
    data: { content },
  });
  revalidate(report.projectId, reportId);
  return success;
}

export async function regenerateSection(
  reportId: string,
  sectionKey: string,
): Promise<ActionResult> {
  const { report } = await requireReportAccess(reportId);
  if (["FINALIZED", "SIGNED", "COUNTERSIGNED", "ARCHIVED"].includes(report.status)) {
    return failure("reportLocked");
  }
  await enqueueJob("REPORT_GENERATION", { reportId, sectionKey });
  revalidate(report.projectId, reportId);
  return success;
}

/** Lock content and render the unsigned PDF. */
export async function finalizeReport(reportId: string): Promise<ActionResult> {
  const { report } = await requireReportAccess(reportId);
  if (report.status !== "GENERATED" && report.status !== "DRAFT") {
    return failure("reportLocked");
  }

  const pdf = await renderReportPdf(reportId);
  const key = `projects/${report.projectId}/reports/${reportId}/report-v${report.version}.pdf`;
  await storage.put(key, pdf, "application/pdf");

  await prisma.report.update({
    where: { id: reportId },
    data: { status: "FINALIZED", finalizedAt: new Date(), pdfStorageKey: key },
  });
  revalidate(report.projectId, reportId);
  return success;
}

const signatureSchema = z.object({
  kind: z.enum(["TECHNICIAN", "INSPECTOR", "CLIENT", "MANAGER"]),
  signerName: z.string().trim().min(1),
  signerTitle: z
    .string()
    .trim()
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .optional(),
  imageDataUrl: z.string().startsWith("data:image/png;base64,"),
});

/** Canvas signature (signature_pad PNG data URL). */
export async function addSignature(
  reportId: string,
  formData: FormData,
): Promise<ActionResult> {
  const { report } = await requireReportAccess(reportId);
  if (!["FINALIZED", "SIGNED"].includes(report.status)) {
    return failure("reportLocked");
  }

  const parsed = signatureSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failure("validation");
  const data = parsed.data;

  const png = Buffer.from(
    data.imageDataUrl.replace("data:image/png;base64,", ""),
    "base64",
  );
  if (png.byteLength > 1024 * 1024) return failure("validation");

  const key = `projects/${report.projectId}/reports/${reportId}/signatures/${createId()}.png`;
  await storage.put(key, png, "image/png");

  await prisma.signature.create({
    data: {
      reportId,
      kind: data.kind,
      method: "CANVAS",
      signerName: data.signerName,
      signerTitle: data.signerTitle ?? null,
      imageStorageKey: key,
    },
  });

  // Re-render the PDF so the signatures section includes the new one.
  const pdf = await renderReportPdf(reportId);
  const pdfKey =
    report.pdfStorageKey ??
    `projects/${report.projectId}/reports/${reportId}/report-v${report.version}.pdf`;
  await storage.put(pdfKey, pdf, "application/pdf");

  const isCountersign = data.kind === "MANAGER";
  await prisma.report.update({
    where: { id: reportId },
    data: {
      pdfStorageKey: pdfKey,
      status: isCountersign ? "COUNTERSIGNED" : "SIGNED",
      ...(isCountersign ? { finalPdfStorageKey: pdfKey } : {}),
    },
  });

  if (isCountersign) {
    // If a signed scan exists, the archive copy is generated PDF + scan.
    const updated = await prisma.report.findUniqueOrThrow({
      where: { id: reportId },
    });
    if (updated.signedScanStorageKey) {
      const generated = await readKey(pdfKey);
      const scan = await readKey(updated.signedScanStorageKey);
      const merged = await mergePdfs([generated, scan]);
      const finalKey = `projects/${report.projectId}/reports/${reportId}/final-v${report.version}.pdf`;
      await storage.put(finalKey, merged, "application/pdf");
      await prisma.report.update({
        where: { id: reportId },
        data: { finalPdfStorageKey: finalKey },
      });
    }
    await notifyManagers({
      type: "REPORT",
      title: `Report countersigned — ${report.project.code}`,
      link: "/manager/reports",
    });
  }

  revalidate(report.projectId, reportId);
  return success;
}

async function readKey(key: string): Promise<Buffer> {
  const stream = await storage.getStream(key);
  const chunks: Uint8Array[] = [];
  const reader = stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  return Buffer.concat(chunks);
}

/** Phone-scanned signed pages (images) → PDF attached to the report. */
export async function uploadSignedScan(
  reportId: string,
  formData: FormData,
): Promise<ActionResult> {
  const { report } = await requireReportAccess(reportId);
  if (!["FINALIZED", "SIGNED"].includes(report.status)) {
    return failure("reportLocked");
  }

  const files = formData
    .getAll("pages")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);
  if (files.length === 0 || files.length > 20) return failure("validation");

  const images: { data: Buffer; mimeType: string }[] = [];
  for (const file of files) {
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      return failure("validation");
    }
    if (file.size > 10 * 1024 * 1024) return failure("validation");
    images.push({
      data: Buffer.from(await file.arrayBuffer()),
      mimeType: file.type,
    });
  }

  const pdf = await imagesToPdf(images);
  const key = `projects/${report.projectId}/reports/${reportId}/signed-scan-v${report.version}.pdf`;
  await storage.put(key, pdf, "application/pdf");

  await prisma.report.update({
    where: { id: reportId },
    data: { signedScanStorageKey: key, status: "SIGNED" },
  });

  await notifyManagers({
    type: "REPORT",
    title: `Signed report uploaded — ${report.project.code}`,
    link: "/manager/reports",
  });

  revalidate(report.projectId, reportId);
  return success;
}
