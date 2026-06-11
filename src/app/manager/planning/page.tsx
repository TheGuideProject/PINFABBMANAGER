import { getTranslations } from "next-intl/server";
import { prisma } from "@/server/db";
import { Badge } from "@/components/ui/badge";
import {
  PlanningCalendar,
  type CalendarEvent,
} from "@/components/planning/planning-calendar";

// Stable per-technician colors for assignment events.
const TECH_PALETTE = [
  "#0ea5e9",
  "#8b5cf6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#14b8a6",
  "#f97316",
  "#6366f1",
];

const addDays = (date: Date, days: number) => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
};
const toDateString = (date: Date) => date.toISOString().slice(0, 10);

export default async function PlanningPage() {
  const t = await getTranslations("pages.planning");

  const [projects, assignments] = await Promise.all([
    prisma.project.findMany({
      where: { status: { notIn: ["CANCELLED"] } },
      select: {
        id: true,
        code: true,
        startDate: true,
        endDate: true,
      },
    }),
    prisma.assignment.findMany({
      where: { status: { notIn: ["CANCELLED"] } },
      include: {
        technician: { include: { user: { select: { name: true } } } },
        project: { select: { id: true, code: true } },
      },
    }),
  ]);

  const technicianIds = [
    ...new Set(assignments.map((assignment) => assignment.technicianId)),
  ];
  const colorFor = (technicianId: string) =>
    TECH_PALETTE[technicianIds.indexOf(technicianId) % TECH_PALETTE.length];

  const events: CalendarEvent[] = [
    // Project windows as background ranges
    ...projects.map((project) => ({
      id: `project-${project.id}`,
      title: project.code,
      start: toDateString(project.startDate),
      // FullCalendar end dates are exclusive
      end: toDateString(addDays(project.endDate, 1)),
      display: "background" as const,
      color: "#bae6fd",
      url: `/manager/projects/${project.id}`,
    })),
    // Assignments as solid events colored per technician
    ...assignments.map((assignment) => ({
      id: `assignment-${assignment.id}`,
      title: `${assignment.technician.user.name} · ${assignment.project.code}`,
      start: toDateString(assignment.startDate),
      end: toDateString(addDays(assignment.endDate, 1)),
      color: colorFor(assignment.technicianId),
      url: `/manager/projects/${assignment.project.id}`,
    })),
  ];

  const legend = assignments
    .filter(
      (assignment, index) =>
        assignments.findIndex(
          (candidate) => candidate.technicianId === assignment.technicianId,
        ) === index,
    )
    .map((assignment) => ({
      id: assignment.technicianId,
      name: assignment.technician.user.name,
      color: colorFor(assignment.technicianId),
    }));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge variant="outline" className="gap-1.5">
          <span className="size-2 rounded-sm bg-sky-200" aria-hidden />
          {t("projectsLayer")}
        </Badge>
        {legend.map((technician) => (
          <Badge key={technician.id} variant="outline" className="gap-1.5">
            <span
              className="size-2 rounded-full"
              style={{ background: technician.color }}
              aria-hidden
            />
            {technician.name}
          </Badge>
        ))}
      </div>

      <PlanningCalendar events={events} />
    </div>
  );
}
