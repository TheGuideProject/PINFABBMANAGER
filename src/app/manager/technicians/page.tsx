import { getTranslations } from "next-intl/server";
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
import { NewTechnicianButton, TechnicianRowActions } from "./technician-form";

export default async function TechniciansPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const t = await getTranslations("pages.technicians");
  const tEntities = await getTranslations("entities");
  const tForms = await getTranslations("forms");

  const now = new Date();
  const technicians = await prisma.technician.findMany({
    where: q
      ? {
          user: {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          },
        }
      : undefined,
    include: {
      user: true,
      skills: { include: { skill: true } },
      assignments: {
        where: {
          status: { in: ["CONFIRMED", "ACTIVE"] },
          startDate: { lte: now },
          endDate: { gte: now },
        },
        include: { project: { include: { location: true } } },
      },
    },
    orderBy: { user: { name: "asc" } },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>
        <NewTechnicianButton />
      </div>
      <SearchInput placeholder={tForms("search")} />

      <Card>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">{tEntities("name")}</TableHead>
                <TableHead>{tEntities("homeBase")}</TableHead>
                <TableHead>{t("skills")}</TableHead>
                <TableHead>{t("deployedNow")}</TableHead>
                <TableHead className="pr-6 text-right">
                  {tEntities("actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {technicians.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-10 text-center text-muted-foreground"
                  >
                    {t("empty")}
                  </TableCell>
                </TableRow>
              ) : (
                technicians.map((technician) => {
                  const deployment = technician.assignments[0];
                  return (
                    <TableRow
                      key={technician.id}
                      className={!technician.user.active ? "opacity-50" : undefined}
                    >
                      <TableCell className="pl-6">
                        <div className="font-medium">{technician.user.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {technician.user.email}
                          {!technician.user.active ? ` · ${t("inactive")}` : ""}
                        </div>
                      </TableCell>
                      <TableCell>{technician.homeBase ?? tEntities("none")}</TableCell>
                      <TableCell>
                        <div className="flex max-w-60 flex-wrap gap-1">
                          {technician.skills.length === 0
                            ? tEntities("none")
                            : technician.skills.map(({ skill }) => (
                                <Badge key={skill.id} variant="secondary">
                                  {skill.name}
                                </Badge>
                              ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {deployment ? (
                          <Badge className="bg-sky-100 text-sky-800 border-sky-200" variant="outline">
                            {deployment.project.code} ·{" "}
                            {deployment.project.location.city ??
                              deployment.project.location.country}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">
                            {tEntities("none")}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="pr-6">
                        <TechnicianRowActions
                          technician={{
                            id: technician.id,
                            name: technician.user.name,
                            email: technician.user.email,
                            phone: technician.phone,
                            homeBase: technician.homeBase,
                            locale: technician.user.locale,
                            active: technician.user.active,
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
