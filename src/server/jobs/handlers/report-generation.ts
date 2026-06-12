import { prisma } from "@/server/db";
import { aiEnabled, extractStructured } from "@/server/services/ai/claude";
import { buildProjectContext } from "@/server/services/ai/prompts";
import { notifyManagers } from "@/server/services/notifications";
import {
  parseStructure,
  type ReportContent,
} from "@/lib/report-template";
import type { AiJob } from "@/generated/prisma/client";

const REPORT_SYSTEM = `You are the report writer for PINFAB, a company that installs and services ship fin stabilizers. You draft the sections of the official end-of-job Service Report from the field data collected by technicians (daily logs, measurements, criticalities, photo captions).

Rules:
- Professional marine-engineering English, third person, factual and concise.
- Ground every statement in the provided data; never invent measurements, dates or events.
- Out-of-spec values, leaks, damages and open issues must be reported honestly with their values and context.
- Use short paragraphs. Use simple dash lists where listing items. No markdown headers (titles are added by the layout).`;

export async function runReportGeneration(job: AiJob) {
  const { reportId, sectionKey } = job.payload as {
    reportId: string;
    sectionKey?: string;
  };

  const report = await prisma.report.findUniqueOrThrow({
    where: { id: reportId },
    include: {
      template: true,
      project: {
        include: {
          dailyLogs: {
            where: { status: { in: ["SUBMITTED", "ANALYZED"] } },
            include: {
              technician: { include: { user: { select: { name: true } } } },
              measurements: { include: { standard: true } },
              photos: true,
            },
            orderBy: { logDate: "asc" },
          },
          criticalities: { orderBy: { createdAt: "asc" } },
        },
      },
    },
  });

  const sections = parseStructure(report.template.structure).filter(
    (section) =>
      (section.kind === "text" || section.kind === "table") &&
      section.key !== "cover" &&
      (!sectionKey || section.key === sectionKey),
  );
  if (sections.length === 0) return { skipped: "no text sections" };

  if (!aiEnabled()) {
    // No API key: leave sections empty but editable rather than wedging the flow.
    await prisma.report.update({
      where: { id: report.id },
      data: { status: "GENERATED", generatedAt: new Date() },
    });
    return { skipped: "ANTHROPIC_API_KEY missing" };
  }

  const context = await buildProjectContext(report.projectId);
  const project = report.project;
  const date = (value: Date) => value.toISOString().slice(0, 10);

  const logLines = project.dailyLogs.map((log) => {
    const measurementText = log.measurements
      .map(
        (measurement) =>
          `${measurement.name}${measurement.finPosition ? ` (${measurement.finPosition})` : ""}: ${measurement.value} ${measurement.unit}${measurement.withinSpec === false ? " [OUT OF SPEC]" : ""}`,
      )
      .join("; ");
    const photoText = log.photos
      .map((photo) => `${photo.category}${photo.caption ? ` "${photo.caption}"` : ""}`)
      .join(", ");
    return [
      `--- ${date(log.logDate)} (${log.technician.user.name}, ${log.workHours ?? "?"}h)`,
      log.notes ? `Notes: ${log.notes}` : null,
      measurementText ? `Measurements: ${measurementText}` : null,
      photoText ? `Photos: ${photoText}` : null,
    ]
      .filter(Boolean)
      .join("\n");
  });

  const criticalityLines = project.criticalities.map(
    (criticality) =>
      `- [${criticality.severity}/${criticality.category}/${criticality.status}] ${criticality.title}: ${criticality.description}`,
  );

  const schema = {
    type: "object",
    properties: Object.fromEntries(
      sections.map((section) => [
        section.key,
        {
          type: "string",
          description: `Content for section "${section.titleEn}". ${section.aiHint}`,
        },
      ]),
    ),
    required: sections.map((section) => section.key),
    additionalProperties: false,
  };

  const { data, usage } = await extractStructured<Record<string, string>>({
    system: REPORT_SYSTEM,
    userContent: [
      {
        type: "text",
        text: [
          context,
          "",
          "=== FIELD DATA ===",
          "",
          "Daily logs:",
          logLines.length > 0 ? logLines.join("\n\n") : "(no submitted logs)",
          "",
          "Criticalities raised during the job:",
          criticalityLines.length > 0 ? criticalityLines.join("\n") : "(none)",
          "",
          `Write the following report section(s): ${sections
            .map((section) => `"${section.titleEn}" (${section.key})`)
            .join(", ")}.`,
        ].join("\n"),
      },
    ],
    schema,
    maxTokens: 32000,
  });

  const existing = (report.content ?? {}) as ReportContent;
  await prisma.report.update({
    where: { id: report.id },
    data: {
      content: { ...existing, ...data },
      status: report.status === "DRAFT" ? "GENERATED" : report.status,
      generatedAt: new Date(),
    },
  });

  if (!sectionKey) {
    await notifyManagers({
      type: "REPORT",
      title: `Report draft ready — ${project.code}`,
      link: "/manager/reports",
    });
  }

  return { sections: sections.map((section) => section.key), usage };
}
