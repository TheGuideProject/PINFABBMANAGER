import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { prisma } from "@/server/db";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SearchInput } from "@/components/forms/search-input";
import { PROJECT_STATUS_BADGE } from "@/lib/status";
import { NewProjectButton } from "./project-form";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const t = await getTranslations("pages.projects");
  const tEntities = await getTranslations("entities");
  const tEnums = await getTranslations("enums");
  const tForms = await getTranslations("forms");
  const format = await getFormatter();

  const [projects, vessels, clients, locations] = await Promise.all([
    prisma.project.findMany({
      where: q
        ? {
            OR: [
              { code: { contains: q, mode: "insensitive" } },
              { title: { contains: q, mode: "insensitive" } },
              { vessel: { name: { contains: q, mode: "insensitive" } } },
            ],
          }
        : undefined,
      include: { vessel: true, client: true, location: true },
      orderBy: [{ status: "asc" }, { startDate: "desc" }],
    }),
    prisma.vessel.findMany({ orderBy: { name: "asc" } }),
    prisma.client.findMany({ orderBy: { name: "asc" } }),
    prisma.location.findMany({ orderBy: { name: "asc" } }),
  ]);

  const options = {
    vessels: vessels.map((vessel) => ({ value: vessel.id, label: vessel.name })),
    clients: clients.map((client) => ({ value: client.id, label: client.name })),
    locations: locations.map((location) => ({
      value: location.id,
      label: `${location.name} (${location.country})`,
    })),
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>
        <NewProjectButton options={options} />
      </div>
      <SearchInput placeholder={tForms("search")} />

      <Card>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">{tEntities("code")}</TableHead>
                <TableHead>{tEntities("vessel")}</TableHead>
                <TableHead>{tEntities("location")}</TableHead>
                <TableHead>{t("dates")}</TableHead>
                <TableHead>{tEntities("type")}</TableHead>
                <TableHead className="pr-6">{tEntities("status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-muted-foreground"
                  >
                    {t("empty")}
                  </TableCell>
                </TableRow>
              ) : (
                projects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell className="pl-6">
                      <Link
                        href={`/manager/projects/${project.id}`}
                        className="font-medium text-sky-700 hover:underline"
                      >
                        {project.code}
                      </Link>
                      <div className="max-w-72 truncate text-xs text-muted-foreground">
                        {project.title}
                      </div>
                    </TableCell>
                    <TableCell>{project.vessel.name}</TableCell>
                    <TableCell>
                      {project.location.city ?? project.location.name},{" "}
                      {project.location.country}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {format.dateTimeRange(project.startDate, project.endDate, {
                        day: "numeric",
                        month: "short",
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {tEnums(`ProjectType.${project.type}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-6">
                      <Badge
                        variant="outline"
                        className={PROJECT_STATUS_BADGE[project.status]}
                      >
                        {tEnums(`ProjectStatus.${project.status}`)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
