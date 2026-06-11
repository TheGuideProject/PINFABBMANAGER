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
import { Card, CardContent } from "@/components/ui/card";
import { SearchInput } from "@/components/forms/search-input";
import { NewVesselButton, VesselRowActions } from "./vessel-form";

export default async function VesselsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const t = await getTranslations("pages.vessels");
  const tEntities = await getTranslations("entities");
  const tForms = await getTranslations("forms");

  const [vessels, clients] = await Promise.all([
    prisma.vessel.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { imoNumber: { contains: q, mode: "insensitive" } },
            ],
          }
        : undefined,
      include: { client: true, _count: { select: { projects: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.client.findMany({ orderBy: { name: "asc" } }),
  ]);

  const clientOptions = clients.map((client) => ({
    value: client.id,
    label: client.name,
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>
        <NewVesselButton clientOptions={clientOptions} />
      </div>
      <SearchInput placeholder={tForms("search")} />

      <Card>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">{tEntities("name")}</TableHead>
                <TableHead>{tEntities("imo")}</TableHead>
                <TableHead>{tEntities("client")}</TableHead>
                <TableHead>{tEntities("stabilizerModel")}</TableHead>
                <TableHead className="text-center">{tEntities("finCount")}</TableHead>
                <TableHead className="pr-6 text-right">
                  {tEntities("actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vessels.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-muted-foreground"
                  >
                    {t("empty")}
                  </TableCell>
                </TableRow>
              ) : (
                vessels.map((vessel) => (
                  <TableRow key={vessel.id}>
                    <TableCell className="pl-6 font-medium">{vessel.name}</TableCell>
                    <TableCell>{vessel.imoNumber ?? tEntities("none")}</TableCell>
                    <TableCell>{vessel.client?.name ?? tEntities("none")}</TableCell>
                    <TableCell>
                      {vessel.stabilizerModel ?? tEntities("none")}
                    </TableCell>
                    <TableCell className="text-center">
                      {vessel.finCount ?? tEntities("none")}
                    </TableCell>
                    <TableCell className="pr-6">
                      <VesselRowActions
                        vessel={{
                          id: vessel.id,
                          name: vessel.name,
                          imoNumber: vessel.imoNumber,
                          vesselType: vessel.vesselType,
                          flag: vessel.flag,
                          clientId: vessel.clientId,
                          stabilizerModel: vessel.stabilizerModel,
                          finCount: vessel.finCount,
                          notes: vessel.notes,
                        }}
                        clientOptions={clientOptions}
                      />
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
