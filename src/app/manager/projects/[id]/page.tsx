import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { ArrowLeft, Building2, MapPin, Ship, Star } from "lucide-react";
import { prisma } from "@/server/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PROJECT_STATUS_BADGE } from "@/lib/status";
import {
  DeleteProjectButton,
  EditProjectButton,
} from "../project-form";
import { Milestones } from "./milestones";
import { ProjectTeam } from "./assignments";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("pages.projects");
  const tEntities = await getTranslations("entities");
  const tEnums = await getTranslations("enums");
  const format = await getFormatter();

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      vessel: true,
      client: true,
      location: true,
      milestones: { orderBy: { dueDate: "asc" } },
      assignments: {
        include: { technician: { include: { user: true } } },
        orderBy: { startDate: "asc" },
      },
    },
  });
  if (!project) notFound();

  const [vessels, clients, locations, technicians] = await Promise.all([
    prisma.vessel.findMany({ orderBy: { name: "asc" } }),
    prisma.client.findMany({ orderBy: { name: "asc" } }),
    prisma.location.findMany({ orderBy: { name: "asc" } }),
    prisma.technician.findMany({
      where: { user: { active: true } },
      include: { user: true },
      orderBy: { user: { name: "asc" } },
    }),
  ]);

  const options = {
    vessels: vessels.map((vessel) => ({ value: vessel.id, label: vessel.name })),
    clients: clients.map((client) => ({ value: client.id, label: client.name })),
    locations: locations.map((location) => ({
      value: location.id,
      label: `${location.name} (${location.country})`,
    })),
  };
  const technicianOptions = technicians.map((technician) => ({
    value: technician.id,
    label: technician.user.name,
  }));

  const dateRange = format.dateTimeRange(project.startDate, project.endDate, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Link
            href="/manager/projects"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden /> {t("title")}
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight">
              {project.code} · {project.title}
            </h1>
            <Badge variant="outline" className={PROJECT_STATUS_BADGE[project.status]}>
              {tEnums(`ProjectStatus.${project.status}`)}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <EditProjectButton
            project={{
              id: project.id,
              code: project.code,
              title: project.title,
              type: project.type,
              status: project.status,
              complexity: project.complexity,
              vesselId: project.vesselId,
              clientId: project.clientId,
              locationId: project.locationId,
              startDate: project.startDate,
              endDate: project.endDate,
              description: project.description,
            }}
            options={options}
          />
          <DeleteProjectButton projectId={project.id} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3">
            <Ship className="size-5 text-slate-400" aria-hidden />
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">{tEntities("vessel")}</div>
              <div className="truncate text-sm font-medium">{project.vessel.name}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3">
            <Building2 className="size-5 text-slate-400" aria-hidden />
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">{tEntities("client")}</div>
              <div className="truncate text-sm font-medium">{project.client.name}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3">
            <MapPin className="size-5 text-slate-400" aria-hidden />
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">
                {tEntities("location")}
              </div>
              <div className="truncate text-sm font-medium">
                {project.location.name}, {project.location.country}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3">
            <Star className="size-5 text-slate-400" aria-hidden />
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">
                {tEntities("complexity")}
              </div>
              <div className="text-sm font-medium">{project.complexity}/5</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">{t("overview")}</TabsTrigger>
          <TabsTrigger value="team">{t("team")}</TabsTrigger>
          <TabsTrigger value="activity">{t("activity")}</TabsTrigger>
          <TabsTrigger value="criticalities">{t("criticalities")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 pt-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("details")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">{t("dates")}: </span>
                {dateRange}
              </div>
              <div>
                <span className="text-muted-foreground">{tEntities("type")}: </span>
                {tEnums(`ProjectType.${project.type}`)}
              </div>
              {project.description ? (
                <p className="whitespace-pre-wrap pt-2 text-slate-700">
                  {project.description}
                </p>
              ) : null}
            </CardContent>
          </Card>
          <Milestones
            projectId={project.id}
            milestones={project.milestones.map((milestone) => ({
              id: milestone.id,
              name: milestone.name,
              dueDate: milestone.dueDate,
              done: milestone.done,
            }))}
          />
        </TabsContent>

        <TabsContent value="team" className="pt-2">
          <ProjectTeam
            projectId={project.id}
            assignments={project.assignments.map((assignment) => ({
              id: assignment.id,
              technicianId: assignment.technicianId,
              technicianName: assignment.technician.user.name,
              role: assignment.role,
              status: assignment.status,
              startDate: assignment.startDate,
              endDate: assignment.endDate,
              travelOutDate: assignment.travelOutDate,
              travelReturnDate: assignment.travelReturnDate,
            }))}
            technicianOptions={technicianOptions}
          />
        </TabsContent>

        <TabsContent value="activity" className="pt-2">
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              {t("activityPlaceholder")}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="criticalities" className="pt-2">
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              {t("criticalitiesPlaceholder")}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
