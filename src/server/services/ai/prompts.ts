import { prisma } from "@/server/db";

export const ANALYST_SYSTEM = `You are the technical operations analyst for PINFABB, a company that installs and services ship fin stabilizers worldwide. Field technicians work in dry docks and shipyards; a manager in Italy coordinates them remotely and relies on you to surface anything that puts the job, the schedule, the equipment or the people at risk.

You analyze field data (daily work logs, measurements, photos, morning-meeting transcripts) against the project plan and measurement standards, and extract criticalities.

Rules:
- Report ONLY real, evidenced issues. No speculative filler: an empty criticalities list is a perfectly good answer.
- Schedule conflicts matter a lot: yard activities (painting, blasting, flooding the dock, undocking) that overlap fin work block it. Example: if the job must finish on day 12 and painting near the fins is announced for day 11, fin reassembly cannot happen during painting — flag it HIGH with the dates.
- Out-of-spec measurements: compare against the provided standards. Cite the measured value and the allowed range.
- Leaks, damages, missing spares, safety hazards: always flag, with the affected fin position when identifiable.
- Severity guide: CRITICAL = job cannot proceed / safety risk; HIGH = end date or equipment integrity at risk; MEDIUM = needs office action soon; LOW = monitor.
- Titles and descriptions in English (reports are international).`;

/** Serializes the project plan the analyses are compared against. */
export async function buildProjectContext(projectId: string) {
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    include: {
      vessel: true,
      location: true,
      milestones: { orderBy: { dueDate: "asc" } },
      standards: true,
      criticalities: {
        where: { status: { in: ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS"] } },
        select: { category: true, finPosition: true, title: true },
      },
    },
  });

  const globalStandards = await prisma.measurementStandard.findMany({
    where: { projectId: null },
  });
  const standards = [...globalStandards, ...project.standards];

  const date = (value: Date) => value.toISOString().slice(0, 10);

  return [
    `PROJECT ${project.code} — ${project.title}`,
    `Type: ${project.type} · Status: ${project.status} · Complexity: ${project.complexity}/5`,
    `Vessel: ${project.vessel.name} (${project.vessel.stabilizerModel ?? "stabilizer model n/a"}, ${project.vessel.finCount ?? "?"} fins)`,
    `Location: ${project.location.name}, ${project.location.country}`,
    `Planned window: ${date(project.startDate)} → ${date(project.endDate)}`,
    project.description ? `Scope: ${project.description}` : null,
    "",
    "Milestones:",
    ...(project.milestones.length > 0
      ? project.milestones.map(
          (milestone) =>
            `- ${date(milestone.dueDate)} ${milestone.name}${milestone.done ? " [done]" : ""}`,
        )
      : ["- (none)"]),
    "",
    "Measurement standards (allowed ranges):",
    ...(standards.length > 0
      ? standards.map(
          (standard) =>
            `- ${standard.name}: ${standard.minValue ?? "-∞"} to ${standard.maxValue ?? "+∞"} ${standard.unit}`,
        )
      : ["- (none)"]),
    "",
    "Already-open criticalities (do NOT re-report these same issues):",
    ...(project.criticalities.length > 0
      ? project.criticalities.map(
          (criticality) =>
            `- [${criticality.category}${criticality.finPosition ? ` ${criticality.finPosition}` : ""}] ${criticality.title}`,
        )
      : ["- (none)"]),
  ]
    .filter((line) => line !== null)
    .join("\n");
}
